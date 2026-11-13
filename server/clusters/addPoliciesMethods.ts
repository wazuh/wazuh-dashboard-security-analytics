import { METHOD_NAMES } from '../utils/constants';

const BASE_PATH = '/_plugins/_content_manager';
export function addPoliciesMethods(securityAnalytics: any, createAction: any): void {
  securityAnalytics[METHOD_NAMES.UPDATE_POLICY] = createAction({
    url: {
      fmt: `${BASE_PATH}/policy/<%=space%>`,
      req: {
        space: {
          type: 'string',
        },
      },
    },
    needBody: true,
    method: 'PUT',
  });

  securityAnalytics[METHOD_NAMES.DELETE_SPACE] = createAction({
    url: {
      fmt: `${BASE_PATH}/space/<%=space%>`,
      req: {
        space: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: false,
    method: 'DELETE',
  });

  // Deletes the decoders, KVDBs and filters of the space and unsets its root decoder.
  securityAnalytics[METHOD_NAMES.CLEAR_SPACE_NORMALIZATION] = createAction({
    url: {
      fmt: `${BASE_PATH}/space/<%=space%>/normalization`,
      req: {
        space: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: false,
    method: 'DELETE',
  });

  securityAnalytics[METHOD_NAMES.GET_POLICY_RESOURCES] = createAction({
    url: {
      fmt: `${BASE_PATH}/policy/resources`,
      params: {
        space: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: false,
    method: 'GET',
  });
}
