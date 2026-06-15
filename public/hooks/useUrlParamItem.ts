/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';

export const useUrlParamItem = (paramName: string) => {
  const history = useHistory();
  const [paramId, setParamId] = useState<string | null>(() =>
    new URLSearchParams(history.location.search).get(paramName)
  );

  useEffect(() => {
    return history.listen((location) => {
      setParamId(new URLSearchParams(location.search).get(paramName));
    });
  }, []);

  const setParam = (id: string) => {
    const params = new URLSearchParams(history.location.search);
    params.set(paramName, id);
    history.push({ ...history.location, search: params.toString() });
  };

  const clearParam = () => {
    const params = new URLSearchParams(history.location.search);
    params.delete(paramName);
    history.replace({ ...history.location, search: params.toString() });
  };

  return { paramId, setParam, clearParam };
};
