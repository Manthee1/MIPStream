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
        code: {
            dataType: 'string',
            notNull: true,
            default: '',
        },
        layoutGridConfig: {
            dataType: 'object',
            notNull: true,
            default: '{}',
        },
        size: {
            dataType: 'number',
            notNull: true,
            default: 0,
        },
        settings: {
            dataType: 'object',
            notNull: true,
            default: '{}',
        },
        savedAt: {
            dataType: 'date_time',
            notNull: true,
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