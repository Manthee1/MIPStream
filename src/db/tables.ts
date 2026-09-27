import { ITable } from "jsstore";

export const projectTableConfig: ITable = {
    name: 'projects',
    columns: {
        id: {
            dataType: 'number',
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            dataType: 'string',
            notNull: true,
        },
        description: {
            dataType: 'string',
            notNull: true,
            default: '',
        },
        software: {
            dataType: 'object',
            notNull: true,
            default: { editors: [] },
        },
        architecture: {
            dataType: 'object',
            notNull: true,
        },
        settings: {
            dataType: 'object',
            notNull: true,
            default: {},
        },
        createdAt: {
            dataType: 'date_time',
            notNull: true,
        },
        updatedAt: {
            dataType: 'date_time',
            notNull: true,
        },
    },
}

