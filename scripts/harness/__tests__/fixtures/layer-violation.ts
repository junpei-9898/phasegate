/**
 * @unit test-unit
 * @layer model
 */
import { DbClient } from "../../infrastructure/db-client";

export class BadModel {
  constructor(private db: DbClient) {}
}
