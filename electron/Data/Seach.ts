import { TSearchTarget } from '../Types/Search.ts';

let _Search_Target_Token_Cache: TSearchTarget[] = []; // a history of all searches that were set programmatically
let _Search_Target_Token: TSearchTarget | null = null; //this will be "consumed" after getting

export function GetLastSearchTargetToken(): Readonly<TSearchTarget> | null {
  if (!_Search_Target_Token_Cache) return null;

  const tmp = { ..._Search_Target_Token };
  _Search_Target_Token = null;
  return tmp;
}

export function SetSearchTargetToken({ ...newSearchTarget }: TSearchTarget) {
  if (!newSearchTarget) return;
  _Search_Target_Token_Cache.push(newSearchTarget);
  _Search_Target_Token = { ...newSearchTarget };
}
