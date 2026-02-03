import { METHOD_NAMES, API, BASE_API_PATH } from "../utils/constants";

const BASE_PATH = "/_plugins/_content_manager";
export function addIntegrationsMethods(
  securityAnalytics: any,
  createAction: any,
): void {
  securityAnalytics[METHOD_NAMES.DELETE_INTEGRATION] = createAction({
    url: {
      fmt: `${BASE_PATH}/integrations/<%=integrationId%>`,
      req: {
        integrationId: {
          type: "string",
          required: true,
        },
      },
    },
    needBody: false,
    method: "DELETE",
  });

  securityAnalytics[METHOD_NAMES.CREATE_INTEGRATION] = createAction({
    url: {
      fmt: `${BASE_PATH}/integrations`,
    },
    needBody: true,
    method: "POST",
  });

  // TODO: add other endpoints
}
