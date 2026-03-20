/**
 * @layer public-api
 * @unit adr-foundation
 *
 * adr-foundation ユニットのバレルエクスポート。
 */

// Composition Root
export { createAdrFoundationModule } from './composition-root.js';

// Presentation — CLI handlers
export { ListAdrsCommandHandler } from './presentation/cli/list-adrs-command-handler.js';
export { ValidateAdrCommandHandler } from './presentation/cli/validate-adr-command-handler.js';
