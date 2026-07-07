// 字源(Unicode 區塊)分類的共用定義：色彩、圖例文字、對應的「只搜此區」旗標字元。
// 旗標字元對照 core.js 的 arrayalize()／legacy/部件檢索.htm 的 Key('@'/'A'..'J'/'X'/'Y'/'Z')。

// desc 顯示在圖例的 tooltip：A~J 的字母只是 Unicode「中日韓統一表意文字擴充區」
// 的批次順序，每一批都混合中日韓越各方提交的罕用字，並非某一國專屬；
// 越後面的區收錄越晚、字越罕見，一般字型越可能沒有字形。
export const BLOCKS = [
  { code: 1, flag: '@', label: '基本', cls: 'bmp', desc: '基本區(URO)——絕大多數常用漢字所在的區塊' },
  { code: 2, flag: 'A', label: 'A區', cls: 'exa', desc: '擴充 A 區，Unicode 3.0(1999)收錄' },
  { code: 3, flag: 'B', label: 'B區', cls: 'exb', desc: '擴充 B 區，Unicode 3.1(2001)收錄，大量古籍罕用字' },
  { code: 4, flag: 'C', label: 'C區', cls: 'exc', desc: '擴充 C 區，Unicode 5.2(2009)收錄' },
  { code: 5, flag: 'D', label: 'D區', cls: 'exd', desc: '擴充 D 區，Unicode 6.0(2010)收錄' },
  { code: 6, flag: 'E', label: 'E區', cls: 'exe', desc: '擴充 E 區，Unicode 8.0(2015)收錄' },
  { code: 7, flag: 'F', label: 'F區', cls: 'exf', desc: '擴充 F 區，Unicode 10.0(2017)收錄' },
  { code: 8, flag: 'G', label: 'G區', cls: 'exg', desc: '擴充 G 區，Unicode 13.0(2020)收錄' },
  { code: 9, flag: 'H', label: 'H區', cls: 'exh', desc: '擴充 H 區，Unicode 15.0(2022)收錄' },
  { code: 10, flag: 'I', label: 'I區', cls: 'exi', desc: '擴充 I 區，Unicode 15.1(2023)收錄' },
  { code: 11, flag: 'J', label: 'J區', cls: 'exj', desc: '擴充 J 區，Unicode 17.0(2025)收錄，中日韓越多方提交的罕用字' },
  { code: 28, flag: 'X', label: '相容', cls: 'cmp', desc: '相容表意文字——與基本區重複的相容碼位，預設不列出' },
  { code: 30, flag: 'Y', label: '補充', cls: 'sup', desc: '補充字——尚未正式編碼，作者暫用私有造字區(PUA)碼位' },
  { code: -1, flag: 'Z', label: '其他', cls: 'oth', desc: '其他區塊(部首、筆畫、符號等非漢字本體的碼位)' },
];

const byCode = new Map();
for (const b of BLOCKS) byCode.set(b.code, b);
// GetBlock() 回傳 29 也算相容、31 也算補充，這裡對齊到同一個圖例分類。
byCode.set(29, byCode.get(28));
byCode.set(31, byCode.get(30));

export function blockInfo(code) {
  return byCode.get(code) ?? byCode.get(-1);
}
