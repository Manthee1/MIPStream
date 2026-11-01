import { Connection, IDataBase } from "jsstore";
import workerInjector from "jsstore/dist/worker_injector";
import { projectTableConfig } from "./tables";

export const connection = new Connection();
connection.addPlugin(workerInjector);


const database: IDataBase = {
    name: 'mipstream',
    tables: [projectTableConfig],
    // v5: nullable `layouts` column for per-project Golden Layout persistence.
    version: 5
}

connection.initDb(database);

const db = connection;
export default db;