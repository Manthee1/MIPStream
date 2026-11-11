import { Connection, IDataBase } from "jsstore";
import workerInjector from "jsstore/dist/worker_injector";
import { architectureTemplatesTableConfig, projectTableConfig } from "./tables";

export const connection = new Connection();
connection.addPlugin(workerInjector);


const database: IDataBase = {
    name: 'mipstream',
    tables: [projectTableConfig, architectureTemplatesTableConfig],
    // v5: nullable `layouts` column for per-project Golden Layout persistence.
    // v6: `architecture_templates` table for user-made "save as template" rows.
    version: 6
}

connection.initDb(database);

const db = connection;
export default db;