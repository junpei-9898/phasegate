/**
 * @layer application
 * @unit quick-mode
 * @work-item-id WI-334
 *
 * ファイルの存在確認を行う Application 層 Port。
 * ClassifyChangeCategoryUseCase が targetChanges を受け取らない経路
 * （CLI: check-change-category --paths）で changeKind を CREATE/MODIFY と
 * 推定するために使用する。hook 経路（beforeContent=null → CREATE）との
 * 判定一致を保証する目的で導入された（WI-334）。
 */

export interface FileExistencePort {
  exists(filePath: string): Promise<boolean>;
}
