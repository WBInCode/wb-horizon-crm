/**
 * GET /api/v1/openapi.json — OpenAPI 3.1 spec for the public REST API.
 *
 * Hand-rolled spec (avoids heavy zod-to-openapi dependency).
 * Update this file when adding new endpoints to /api/v1/*.
 */

import { NextResponse } from "next/server"

export const runtime = "nodejs"

const PAGINATION_PARAMS = [
  {
    name: "limit",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
    description: "Page size (1-200).",
  },
  {
    name: "cursor",
    in: "query",
    required: false,
    schema: { type: "string" },
    description: "Cursor (id of the last item from previous page).",
  },
]

const PAGINATED = (itemSchemaRef: string) => ({
  type: "object",
  properties: {
    data: { type: "array", items: { $ref: itemSchemaRef } },
    nextCursor: { type: "string", nullable: true },
    hasMore: { type: "boolean" },
  },
  required: ["data", "nextCursor", "hasMore"],
})

const ERROR_RESPONSES = {
  "401": {
    description: "Unauthorized — missing/invalid API key.",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
  },
  "403": {
    description: "Forbidden — API key lacks required scope.",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
  },
  "422": {
    description: "Validation error.",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } },
  },
}

const spec = {
  openapi: "3.1.0",
  info: {
    title: "WB Horizon CRM Public API",
    version: "1.0.0",
    description:
      "Public REST API for WB Horizon CRM. Authenticate with `Authorization: Bearer wbh_<key>`.\n\n" +
      "Scopes: `leads:read`, `leads:write`, `clients:read`, `clients:write`, `cases:read`, `cases:write`, `*` (all).\n\n" +
      "Pagination: cursor-based via `?limit=&cursor=`.",
    contact: { name: "WB Horizon" },
  },
  servers: [{ url: "/", description: "Current host" }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Leads" },
    { name: "Clients" },
    { name: "Cases" },
  ],
  paths: {
    "/api/v1/leads": {
      get: {
        tags: ["Leads"],
        summary: "List leads",
        parameters: [
          ...PAGINATION_PARAMS,
          {
            name: "status",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["NEW", "TO_CONTACT", "IN_CONTACT", "MEETING_SCHEDULED", "AFTER_MEETING", "QUALIFIED", "NOT_QUALIFIED", "TRANSFERRED", "CLOSED"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of leads.",
            content: {
              "application/json": { schema: PAGINATED("#/components/schemas/Lead") },
            },
          },
          ...ERROR_RESPONSES,
        },
      },
      post: {
        tags: ["Leads"],
        summary: "Create a lead",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LeadCreate" } },
          },
        },
        responses: {
          "201": {
            description: "Created lead.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Lead" } } },
          },
          ...ERROR_RESPONSES,
        },
      },
    },
    "/api/v1/clients": {
      get: {
        tags: ["Clients"],
        summary: "List clients",
        parameters: [
          ...PAGINATION_PARAMS,
          {
            name: "stage",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["LEAD", "PROSPECT", "QUOTATION", "SALE", "CLIENT", "INACTIVE"],
            },
          },
          { name: "archived", in: "query", required: false, schema: { type: "boolean" } },
        ],
        responses: {
          "200": {
            description: "Paginated list of clients.",
            content: {
              "application/json": { schema: PAGINATED("#/components/schemas/Client") },
            },
          },
          ...ERROR_RESPONSES,
        },
      },
      post: {
        tags: ["Clients"],
        summary: "Create a client",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ClientCreate" } },
          },
        },
        responses: {
          "201": {
            description: "Created client.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Client" } } },
          },
          ...ERROR_RESPONSES,
        },
      },
    },
    "/api/v1/cases": {
      get: {
        tags: ["Cases"],
        summary: "List cases",
        parameters: [
          ...PAGINATION_PARAMS,
          { name: "stage", in: "query", required: false, schema: { type: "string" } },
          { name: "status", in: "query", required: false, schema: { type: "string" } },
          { name: "clientId", in: "query", required: false, schema: { type: "string" } },
          { name: "archived", in: "query", required: false, schema: { type: "boolean" } },
        ],
        responses: {
          "200": {
            description: "Paginated list of cases.",
            content: {
              "application/json": { schema: PAGINATED("#/components/schemas/Case") },
            },
          },
          ...ERROR_RESPONSES,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "wbh_<key>",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
        required: ["error"],
      },
      ValidationError: {
        type: "object",
        properties: {
          error: { type: "string" },
          details: { type: "object" },
        },
        required: ["error"],
      },
      Lead: {
        type: "object",
        properties: {
          id: { type: "string" },
          companyName: { type: "string" },
          nip: { type: "string", nullable: true },
          industry: { type: "string", nullable: true },
          website: { type: "string", nullable: true },
          source: { type: "string", nullable: true },
          sourceId: { type: "string", nullable: true },
          contactPerson: { type: "string" },
          position: { type: "string", nullable: true },
          phone: { type: "string" },
          email: { type: "string", nullable: true },
          isDecisionMaker: { type: "boolean" },
          status: { type: "string" },
          priority: { type: "string", nullable: true },
          notes: { type: "string", nullable: true },
          needs: { type: "string", nullable: true },
          nextStep: { type: "string", nullable: true },
          nextStepDate: { type: "string", format: "date-time", nullable: true },
          meetingDate: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      LeadCreate: {
        type: "object",
        required: ["companyName", "contactPerson", "phone"],
        properties: {
          companyName: { type: "string", maxLength: 200 },
          nip: { type: "string", nullable: true },
          industry: { type: "string", nullable: true },
          website: { type: "string", format: "uri", nullable: true },
          contactPerson: { type: "string" },
          position: { type: "string", nullable: true },
          phone: { type: "string" },
          email: { type: "string", format: "email", nullable: true },
          isDecisionMaker: { type: "boolean" },
          notes: { type: "string", nullable: true },
          needs: { type: "string", nullable: true },
          source: { type: "string", nullable: true },
          sourceId: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["NEW", "TO_CONTACT", "IN_CONTACT", "MEETING_SCHEDULED", "AFTER_MEETING", "QUALIFIED", "NOT_QUALIFIED", "TRANSFERRED", "CLOSED"],
          },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], nullable: true },
          meetingDate: { type: "string", format: "date-time", nullable: true },
          nextStep: { type: "string", nullable: true },
          nextStepDate: { type: "string", format: "date-time", nullable: true },
        },
      },
      Client: {
        type: "object",
        properties: {
          id: { type: "string" },
          companyName: { type: "string" },
          nip: { type: "string", nullable: true },
          industry: { type: "string", nullable: true },
          website: { type: "string", nullable: true },
          hasWebsite: { type: "boolean" },
          address: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          stage: { type: "string" },
          sourceId: { type: "string", nullable: true },
          ownerId: { type: "string", nullable: true },
          caretakerId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          archivedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ClientCreate: {
        type: "object",
        required: ["companyName"],
        properties: {
          companyName: { type: "string", maxLength: 200 },
          nip: { type: "string", nullable: true },
          industry: { type: "string", nullable: true },
          website: { type: "string", format: "uri", nullable: true },
          hasWebsite: { type: "boolean" },
          address: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          notes: { type: "string", nullable: true },
          requirements: { type: "string", nullable: true },
          stage: {
            type: "string",
            enum: ["LEAD", "PROSPECT", "QUOTATION", "SALE", "CLIENT", "INACTIVE"],
          },
          sourceId: { type: "string", nullable: true },
        },
      },
      Case: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          serviceName: { type: "string", nullable: true },
          status: { type: "string" },
          processStage: { type: "string" },
          detailedStatus: { type: "string" },
          clientId: { type: "string" },
          productId: { type: "string", nullable: true },
          salesId: { type: "string", nullable: true },
          caretakerId: { type: "string", nullable: true },
          contractSignedAt: { type: "string", format: "date-time", nullable: true },
          executionStartAt: { type: "string", format: "date-time", nullable: true },
          executionEndAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          archivedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
    },
  },
} as const

export function GET() {
  return NextResponse.json(spec)
}
