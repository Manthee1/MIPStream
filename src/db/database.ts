import { Connection, IDataBase } from "jsstore";
import workerInjector from "jsstore/dist/worker_injector";
import { instructionTableConfig, projectTableConfig } from "./tables";

export const connection = new Connection();
connection.addPlugin(workerInjector);


const database: IDataBase = {
    name: 'mipstream',
    tables: [projectTableConfig, instructionTableConfig],
    version: 2
}
let isDbCreated = false;

connection.initDb(database);

const db = connection;
export default db;