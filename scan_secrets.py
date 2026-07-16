import os
import re
import subprocess
import sys

# Regexes
re_private_key = re.compile(r'-----BEGIN\s+(?:RSA\s+|EC\s+)?PRIVATE\s+KEY-----', re.IGNORECASE)
re_jwt = re.compile(r'\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*\b')
re_github = re.compile(r'\bgh[pousr]_[A-Za-z0-9_]{36,255}\b')
re_stripe = re.compile(r'\bsk_(?:live|test)_[A-Za-z0-9_]{10,255}\b')
re_aws = re.compile(r'\bAKIA[0-9A-Z]{16}\b')

# Assignment regex for keys like API_KEY, SECRET, PASSWORD, TOKEN
re_assign = re.compile(
    r'\b(\w*(?:api[-_]?key|secret|password|token|pwd|passphrase|auth[-_]?key|jwt[-_]?secret)\w*)\s*[:=]\s*([\'"`])([^\'"`\n]+)\2',
    re.IGNORECASE
)

# Placeholders or typical test words that make it safe
PLACEHOLDER_WORDS = {
    'placeholder', 'dummy', 'todo', 'changeme', 'change-me', 'change_me',
    'your-api-key', 'your_api_key', 'your-secret', 'your_secret',
    'test', 'test-token', 'test_token', 'test-secret', 'test_secret', 'test-password', 'test_password',
    'my-secret', 'mysecret', 'my-password', 'mypassword',
    'supersecret', 'super-secret', 'super_secret', 'admin123', 'admin_123',
    'app_password', 'db_password', 'some_secret', 'some_password',
    'secret_key', 'secretkey', 'example', 'mock', 'demo', 'fake'
}

def is_placeholder(val):
    val_lower = val.lower().strip()
    if not val_lower:
        return True
    
    # Check if is a process.env or similar
    if 'process.env.' in val_lower or 'process.env[' in val_lower:
        return True
    
    # Check if exact match to placeholders
    if val_lower in PLACEHOLDER_WORDS:
        return True
        
    # Check if contains patterns like "your-" or "my-" or "test-" or ending with placeholders
    for p in PLACEHOLDER_WORDS:
        if p in val_lower:
            return True
            
    # Check if just symbols or very short
    if len(val_lower) < 4:
        return True
        
    return False

def scan_file(filepath):
    results = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for idx, line in enumerate(f, 1):
                # Check for Private Key
                if re_private_key.search(line):
                    results.append({
                        'line': idx,
                        'pattern': 'PRIVATE KEY',
                        'classification': 'REVIEW'
                    })
                    continue
                
                # Check for JWT
                jwt_match = re_jwt.search(line)
                if jwt_match:
                    jwt_val = jwt_match.group(0)
                    if len(jwt_val) > 20 and 'placeholder' not in jwt_val.lower():
                        results.append({
                            'line': idx,
                            'pattern': 'JWT Token',
                            'classification': 'REVIEW'
                        })
                    else:
                        results.append({
                            'line': idx,
                            'pattern': 'JWT Token',
                            'classification': 'SAFE_TEST/PLACEHOLDER'
                        })
                    continue
                
                # Check for GitHub Token
                gh_match = re_github.search(line)
                if gh_match:
                    results.append({
                        'line': idx,
                        'pattern': 'GitHub Token',
                        'classification': 'REVIEW'
                    })
                    continue
                
                # Check for Stripe
                stripe_match = re_stripe.search(line)
                if stripe_match:
                    val = stripe_match.group(0)
                    classification = 'REVIEW'
                    if 'sk_test' in val or 'test' in val.lower():
                        classification = 'SAFE_TEST/PLACEHOLDER'
                    results.append({
                        'line': idx,
                        'pattern': 'Stripe Key',
                        'classification': classification
                    })
                    continue
                
                # Check for AWS
                aws_match = re_aws.search(line)
                if aws_match:
                    results.append({
                        'line': idx,
                        'pattern': 'AWS AKIA Token',
                        'classification': 'REVIEW'
                    })
                    continue
                
                # Check for keyword assignments
                assign_match = re_assign.search(line)
                if assign_match:
                    key, quote, val = assign_match.groups()
                    if is_placeholder(val):
                        results.append({
                            'line': idx,
                            'pattern': f'Assignment ({key})',
                            'classification': 'SAFE_TEST/PLACEHOLDER'
                        })
                    else:
                        results.append({
                            'line': idx,
                            'pattern': f'Assignment ({key})',
                            'classification': 'REVIEW'
                        })
    except Exception as e:
        pass
    return results

def get_status_files():
    result = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True, check=True)
    lines = result.stdout.splitlines()
    files = []
    for line in lines:
        if not line or len(line) < 4:
            continue
        status = line[:2]
        path = line[3:].strip()
        
        if path.startswith('"') and path.endswith('"'):
            path = path[1:-1]
            
        if 'D ' in status or status.startswith('D') or 'graphify-out' in path:
            continue
            
        if os.path.isdir(path):
            for root, dirs, filenames in os.walk(path):
                if 'graphify-out' in root:
                    continue
                for f in filenames:
                    fullpath = os.path.join(root, f)
                    files.append(fullpath)
        else:
            files.append(path)
            
    specials = ['prisma/seed-demo.ts', 'src/lib/hub.ts', 'src/lib/totp.ts', 'next.config.ts']
    for sp in specials:
        if os.path.exists(sp) and sp not in files:
            files.append(sp)
            
    txt_extensions = {
        '.ts', '.tsx', '.js', '.jsx', '.json', '.env', '.md', '.yml', '.yaml', 
        '.prisma', '.sql', '.toml', '.css', '.html', '.txt'
    }
    
    final_files = []
    for f in files:
        _, ext = os.path.splitext(f)
        if ext.lower() in txt_extensions or f.endswith('.gitignore'):
            final_files.append(f)
            
    return sorted(list(set(final_files)))

def main():
    files = get_status_files()
    found_secrets = False
    for f in files:
        res = scan_file(f)
        if res:
            found_secrets = True
            for r in res:
                print(f"{f}:{r['line']} | {r['pattern']} | {r['classification']}")
                
    if not found_secrets:
        print("No matches found.")

if __name__ == '__main__':
    main()
