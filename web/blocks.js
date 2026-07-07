// 字源(Unicode 區塊)分類的共用定義：色彩、圖例文字、對應的「只搜此區」旗標字元。
// 旗標字元對照 core.js 的 arrayalize()／legacy/部件檢索.htm 的 Key('@'/'A'..'J'/'X'/'Y'/'Z')。

export const BLOCKS = [
  { code: 1, flag: '@', label: '基本', cls: 'bmp' },
  { code: 2, flag: 'A', label: 'A區', cls: 'exa' },
  { code: 3, flag: 'B', label: 'B區', cls: 'exb' },
  { code: 4, flag: 'C', label: 'C區', cls: 'exc' },
  { code: 5, flag: 'D', label: 'D區', cls: 'exd' },
  { code: 6, flag: 'E', label: 'E區', cls: 'exe' },
  { code: 7, flag: 'F', label: 'F區', cls: 'exf' },
  { code: 8, flag: 'G', label: 'G區', cls: 'exg' },
  { code: 9, flag: 'H', label: 'H區', cls: 'exh' },
  { code: 10, flag: 'I', label: 'I區', cls: 'exi' },
  { code: 11, flag: 'J', label: 'J區', cls: 'exj' },
  { code: 28, flag: 'X', label: '相容', cls: 'cmp' },
  { code: 30, flag: 'Y', label: '補充', cls: 'sup' },
  { code: -1, flag: 'Z', label: '其他', cls: 'oth' },
];

const byCode = new Map();
for (const b of BLOCKS) byCode.set(b.code, b);
// GetBlock() 回傳 29 也算相容、31 也算補充，這裡對齊到同一個圖例分類。
byCode.set(29, byCode.get(28));
byCode.set(31, byCode.get(30));

export function blockInfo(code) {
  return byCode.get(code) ?? byCode.get(-1);
}
