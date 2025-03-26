import { Connection, IDataBase } from "jsstore";
import workerInjector from "jsstore/dist/worker_injector";
import { projectTableConfig } from "./tables";

export const connection = new Connection();
connection.addPlugin(workerInjector);


const database: IDataBase = {
    name: 'mipstream',
    tables: [projectTableConfig],
    version: 3
}
let isDbCreated = false;

isDbCreated = await connection.initDb(database);

const db = connection;
export default db;