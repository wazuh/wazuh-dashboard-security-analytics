/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { NotificationsStart } from 'opensearch-dashboards/public';
import { errorNotificationToast } from '../utils/helpers';
import LogTestService from '../services/LogTestService';


export class LogTestStore {
    constructor(private service: LogTestService, private notifications: NotificationsStart) { }

    logTest = async (body: {
        document: any;
        integrationId: string;
    }): Promise<any | undefined> /* TODO: UPDATE WITH RESPONSE TYPE */ => {

        const response = await this.service.test(body);
        if (!response.ok) {
            errorNotificationToast(this.notifications, 'test', 'log', response.error);
            return undefined;
        }

        const item = response.response.item;
        if (!item) {
            return undefined;
        }

        return {
            ...item,
        };
    };

}