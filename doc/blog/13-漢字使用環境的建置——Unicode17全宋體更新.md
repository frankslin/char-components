# 漢字使用環境的建置——Unicode 17 全宋體更新

- 作者：WFG
- 發布日期：2025年9月12日 星期五
- 原始連結：http://fgwang.blogspot.com/2025/09/unicode-17.html

---

☆ 2025/09/25 「全宋體」、「倉頡碼表」及「部件檢索」發現一些小瑕疵，現已更新，原連結請重新下載。

## 擴展 J 區

9月9日，Unicode 官方一如預告，發布了最新的 Unicode 17.0 版。前次的 Unicode 16 並未新增任何漢字，而此次則添加了擴展 J 區（另 C 區 6 字、E 區 12 字）等共 4316 個漢字。基於以往的經驗，八月初我就開始偷跑，投入了新增漢字的整理工作。七月底 jcz777 兄分享了自製的 J 區字型時，我便央請他協助建立新字的拆分資料。8月3日 J 兄完成初步拆分，於是我從 Unicode 文件中抽取數據，8月4日完成了 4316 個基於官方字形的新字製作，藉著新字型我開始逐字驗證 J 兄建立的拆分數據。8月12日拆分複驗完畢，做了不少訂正與補充，期間也反饋給 J 兄一些造字的錯誤，至此準備的工作完成了大半。

## 遷碼對照表

初步完成了字型以及「部件檢索」，有了顯示及檢字的工具，我與 suns99 兄就雙雙投入了補充字對 J 區字的遷碼整理，看哪些補充字已經被收入 J 區之中。這是最花時間的工作，所以我不得不提前偷跑，希望在最短的時間內能跟上官方的發布。suns99 兄的動作遠比我快，8月8日即用倉頡輸入法完成了一份對照表草稿，而我在複驗完拆分數據後，緊接著用批量「部件檢索」加上人工排查，針對兩份草稿逐一比對、修訂，期間還不時需回頭查核、調整字形。經過幾輪逐字、甚至幾乎是逐筆畫的仔細比對，終於在八月底完成了正式的遷碼對照表。J 區的 4298 字之中，有 1862 字是補充區已收錄字，加上 C 區 5 字、E 區 6 字也是已收錄，實際上只有 2443 字算是新增。

有了遷碼對照表，我就能以批量的方式，將我製作的數百部辭典，進行遷碼的工作。把用到這些補充字的相關文件，全部轉碼改用正式的 J 區字，然後這 1870 個補充字就可以功成身退了。

下載連結：補充字對J區字遷碼對照表.zip(https://drive.google.com/file/d/19LYCwsixYc0Aabutw9XVvScRYgCXQAsh/view?usp=sharing)

您若曾利用「全宋體」的補充漢字來製作文件，可借助這個遷碼對照表，將相關的文件快速遷碼至 J 區用字。更新字型之前請務必確認您所有的文件都已遷碼完成，以避免顯示錯亂的情形發生。

**p.s.**遷碼對照表中額外包含了 9 個 C 區、E 區字的遷碼對應。另外，這次 Unicode 改動了「峀」、「𣍟」的台灣字形定義，建議台灣地區的朋友將遷碼表中的前三筆也加入轉碼；大陸地區的朋友則可將前三筆移除。

## J 區優化

我逐字、甚至幾乎是逐筆畫的仔細比對遷碼對照表，除了追求完全零失誤之外，另一個重要目的就是要把與 J 區重複的補充字字形抽取出來，擇其優者取代掉質量較差的 J 區字形。遇有某些太不順眼的越南提交字形，還要自行重新造字替換。至此 J 區的字型與拆分資料才算是大致完成，時間已來到九月初。

## 康熙字典補完

除了擴展 J 區之外，事實上這一版的「全宋體」還增收了一些新字。原先《康熙字典》的釋文裏尚有大量未編碼字只能以圖片字或構字式呈現，長期以來我與 suns99 兄一直致力於消滅這些未編碼字，這次又得 jcz777 兄相助造字，我則努力查證、分辨訛誤，耗時數月，終於將全部的未編碼字清理完畢。加上了兩百餘條校注，新造了近百個字形。除少數當予訂正的訛字未予收錄外，現在「全宋體」已能完全涵蓋《康熙字典》全文，不再有缺字問題（先讓我喘口氣，《康熙字典》容我擇日再另行發布）。

至於拆分資料的部分，仍是我的痛處，尚有海量的拆分資料等著我去進一步完善。只能且戰且走，先將這個尚未完全優化的版本推出，讓大家先有個工具可用，至於進一步臻至完善，只好徐徐後圖了。

https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjfxvDC2Bytu5NNqqfa4u4KthSY1SWnbk387-T6YYpivLZYnx_w6ENZDcuvsDl7qxRaF-oYX3hy8hCfOz06mQr0t6vMIGTboNPrZXFi4OfUJ7tfSLpkX7UHB466wm36og8uXghorEM8cbztl1JRNfAgLBYra81yT2gdb-5JYdJI6FxKquPrNZDf5Mlg/s1370/20220919100320.png【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEhLCstW6LlIsq3YNRQD_n7PlC7LH3ndkLAGvqK2USfUZZBCycQsIf8HtGnvW33BjDiZuBcC4u-qFahFylyhlAjwDtP9dNtn_Gk-0utGSJdgtkiSPQwEIRZeOCwfyk_fBFNb4xVxMsBBfrQik_sLHxiqgwg1_lOZbpKVXK-lxMQ64PZ87jqT0Kh_StJhmkE=w640-h292)(https://blogger.googleusercontent.com/img/a/AVvXsEhLCstW6LlIsq3YNRQD_n7PlC7LH3ndkLAGvqK2USfUZZBCycQsIf8HtGnvW33BjDiZuBcC4u-qFahFylyhlAjwDtP9dNtn_Gk-0utGSJdgtkiSPQwEIRZeOCwfyk_fBFNb4xVxMsBBfrQik_sLHxiqgwg1_lOZbpKVXK-lxMQ64PZ87jqT0Kh_StJhmkE)

## Windows 11 字型安裝說明

我的電腦較舊，不符合 Windows 11 的最低要求，所以一直以來都停留在 Windows 7 的作業系統，只要參照 漢字使用環境的建置 ㈠ —— 顯示篇(https://fgwang.blogspot.com/2018/02/blog-post.html) 的說明安裝字型，基本上都沒問題。期間有些朋友向我反應 Windows 11 下安裝會有些問題，我也借了一部 Windows 11 的電腦重現了問題，但苦無解方。後來，隨著各方都逐漸停止支援，終於不得不換到了 Windows 11 的環境下，也不得不開始正視這個問題。

經過了一段時間的實際使用及測試，我終於釐清了問題，試著在這邊略作說明。

將「全宋體」的七個字型檔按正常方式安裝並雙擊「SurrogateFallback.reg」進行機碼設定後，再雙擊「漢字簡易測試.txt」，應該會看到這情形：

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEhEHTze6xvL5EOC9QK_-cukR6S41id3VJIgvHhJXQsHublfPPF6FZcxW1fBRp_C4mtuPgyV6evclL2jeur37eAHLHWHmZU_3jri_pVGGPrGqalu6wntE_v-62HKRL16teCdaYJUpb9AgtPWegLv03wB3XrK0F3tFijC2lkNUjlkfaG8vnbq8QcB2Hit_-4=s16000)(https://blogger.googleusercontent.com/img/a/AVvXsEhEHTze6xvL5EOC9QK_-cukR6S41id3VJIgvHhJXQsHublfPPF6FZcxW1fBRp_C4mtuPgyV6evclL2jeur37eAHLHWHmZU_3jri_pVGGPrGqalu6wntE_v-62HKRL16teCdaYJUpb9AgtPWegLv03wB3XrK0F3tFijC2lkNUjlkfaG8vnbq8QcB2Hit_-4)

坑坑巴巴的滿是「豆腐塊」，讓人誤以為是安裝有問題，沒辦法正確顯示全部漢字。其實這是 Windows 11 的「記事本」問題，加入了什麼 AI 等一大堆功能，但卻不再遵循 SurrogateFallback 的設定來取用字型，導致大家誤會字型沒安裝成功。

既然是 Windows 11 的「記事本」問題，於是我想「如果我從沒問題的 Windows 7 裏借『記事本』來用總可以了吧！」沒想到 Windows 11 會「頑強抵抗」「全面封鎖」，不管是 Windows 7、Windows 10，不管是 32 位元還是 64 位元版本的「記事本」，只要一在 Windows 11 下執行，全部被攔截轉而變成執行 Windows 11 本身的「記事本」，讓你不得「越雷池一步」。

我不死心，最後從 Windows XP 裏請出了「記事本」軟體，結果 Windows 11 大概沒想到有人會有這一招，居然可以執行了。

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEguMz0n0xM2mfFQfDNAqSBf0roGVRck3Zhr-A75myWafS8CNYbJkIMHAqKRk7oQrpl1cvIj2trs4cVhFHzBH7Q89sXzG8wtBPfPj78gIPfbHBJ-s_koNq1JbwQwKU4OzIK9sBZTpU33POvYQEe0fliM4oQQzeOZv7WDxLmCMMbDBK1IfeXSUDu1SyWXfgg=s16000)(https://blogger.googleusercontent.com/img/a/AVvXsEguMz0n0xM2mfFQfDNAqSBf0roGVRck3Zhr-A75myWafS8CNYbJkIMHAqKRk7oQrpl1cvIj2trs4cVhFHzBH7Q89sXzG8wtBPfPj78gIPfbHBJ-s_koNq1JbwQwKU4OzIK9sBZTpU33POvYQEe0fliM4oQQzeOZv7WDxLmCMMbDBK1IfeXSUDu1SyWXfgg)

全部的「豆腐塊」都不見了，證明了其實字型的安裝是成功的，純粹只是 Windows 11 的「記事本」在作怪。但請注意截圖中的紅框處，I 區的漢字居然沒顯示，這應該就真的是 Windows 11 的 BUG 了，目前為止我無解方。所以要想在 Windows 11 下同時顯示全部漢字，必須還是要靠軟體自行支援字型的遞補顯示，例如 EmEditor 有此功能，否則 I 區的字形還是無法正確顯示。

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEhI3pg7mDMiGTfoQvCAO8ZNC3UF0ozfPYZ_FReRzfoq18CWpJmgTJSHeTrmgCvTe9E9VVM3yMrAiK4FuXCVkCw_w8oGSBv-Vtp3AvNl8IogcKewiR8c-VSU9lSvxck2T4PIsZ4xCLDYLYG9ewYREvzaZ7suvhEoBUALt9R3P36Vh06F3txS4Nbg31FTR6c=w600-h640)(https://blogger.googleusercontent.com/img/a/AVvXsEhI3pg7mDMiGTfoQvCAO8ZNC3UF0ozfPYZ_FReRzfoq18CWpJmgTJSHeTrmgCvTe9E9VVM3yMrAiK4FuXCVkCw_w8oGSBv-Vtp3AvNl8IogcKewiR8c-VSU9lSvxck2T4PIsZ4xCLDYLYG9ewYREvzaZ7suvhEoBUALt9R3P36Vh06F3txS4Nbg31FTR6c)

## 附記

這次的 Unicode 17 有幾個收字需要說明一下：

U+5CC0 原先的定義是：

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEi7QUGdAb54U-Ku5Lw2oiOc6TJn-_7cidWa6Hg1F7WDdwYKzh8kBGK75sFMNxRGbHUFgmb98hFoONX85jrhfPdYJfBrQutoeEBX6V7LvcEfDlugvWpv8XN8q5b0XJXtYfOxszf0rnEgNkJyTlWxuSHvI7XwRFLASKLweqIZjyQWy-zA42gxRFPIfbykmzk=w640-h118)(https://blogger.googleusercontent.com/img/a/AVvXsEi7QUGdAb54U-Ku5Lw2oiOc6TJn-_7cidWa6Hg1F7WDdwYKzh8kBGK75sFMNxRGbHUFgmb98hFoONX85jrhfPdYJfBrQutoeEBX6V7LvcEfDlugvWpv8XN8q5b0XJXtYfOxszf0rnEgNkJyTlWxuSHvI7XwRFLASKLweqIZjyQWy-zA42gxRFPIfbykmzk)

Unicode 17 改成了：

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEjmn3neTcLBj2cnQzc6iBsdNM9gdI3FNhVBCok_NSuiQnegIz4LWHdhNJ5b0BLnGYIXm6XB5y9zbtYudXghUPb2leeYRUmrfgXKmYjU1DOFBGnhn_nLSwOSRx9MI1Vx9P1G85DuTKFpIC4QTAH3gMC7mQZmT_00E-B15c-i6YVbTnErq-Kib44cur428YU=w640-h114)(https://blogger.googleusercontent.com/img/a/AVvXsEjmn3neTcLBj2cnQzc6iBsdNM9gdI3FNhVBCok_NSuiQnegIz4LWHdhNJ5b0BLnGYIXm6XB5y9zbtYudXghUPb2leeYRUmrfgXKmYjU1DOFBGnhn_nLSwOSRx9MI1Vx9P1G85DuTKFpIC4QTAH3gMC7mQZmT_00E-B15c-i6YVbTnErq-Kib44cur428YU)

另在 C 區新增了一字：

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEhtTYrBzxoQTlUnED336OhUA0alzEvdbA8QELsvJZGGeiVr_A_xkzzdwMUAlSwA2KS9XG6SCUljVt2HxWsLIJ_9CZjQSuivIDev54WlUe6NAGRQgepuzJys-bjjCMNYwbR9ZfMqlXi1d11uyV6te7u-CGq-CoCmTAVTjmvtlnv26xtQwa1MMKYMQi9kcL8=w400-h131)(https://blogger.googleusercontent.com/img/a/AVvXsEhtTYrBzxoQTlUnED336OhUA0alzEvdbA8QELsvJZGGeiVr_A_xkzzdwMUAlSwA2KS9XG6SCUljVt2HxWsLIJ_9CZjQSuivIDev54WlUe6NAGRQgepuzJys-bjjCMNYwbR9ZfMqlXi1d11uyV6te7u-CGq-CoCmTAVTjmvtlnv26xtQwa1MMKYMQi9kcL8)

U+2B73A 此字 T 源的標示是「T4-2634」，表示是據 CNS-11643 收字，此形原先是位於 U+5CC0 的碼位之下，此次將其與 U+5CC0 脫鉤，移至 U+2B73A，而 U+5CC0 的 T 源位置則換上「TF-2662」，此形原位於 U+2F879。簡言之，原先的台標 U+5CC0「⿱山田」字形改移至 U+2B73A，而原先的 U+2F879「⿱山由」字形改移至 U+5CC0，由兼容字扶正。這一改動對陸標而言，U+5CC0「⿱山由」字形維持不變，而原先缺乏的《康熙字典》「⿱山田」字形則新增於 U+2B73A。但對台標而言，影響甚大，所有的 U+5CC0「⿱山田」字形必須遷碼才能符合 Unicode 規範，影響的既有文件數量恐怕很大，很多的網站、資料庫可能都無力修正。

另一字 U+2F980 的定義是：

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEgyEXofHqkwiPBwGAzJymVffNycp277bLlMjvo4LmmP8UwJPMDYgVC2vQNRp6Q3ZQrApNRuSXit9zdChJ_cULwoFRBm-LSPV3GN7zg6oiQgq5lbxKZ8fHNFgdKQSjXTKUVvamXEPYg8uGMAvrVvK3a---4miUNY-Uv2nVR-QJmWAxGmQUEJjVjOdseAEao)(https://blogger.googleusercontent.com/img/a/AVvXsEgyEXofHqkwiPBwGAzJymVffNycp277bLlMjvo4LmmP8UwJPMDYgVC2vQNRp6Q3ZQrApNRuSXit9zdChJ_cULwoFRBm-LSPV3GN7zg6oiQgq5lbxKZ8fHNFgdKQSjXTKUVvamXEPYg8uGMAvrVvK3a---4miUNY-Uv2nVR-QJmWAxGmQUEJjVjOdseAEao)

原先「全宋體」借作了

形，這次 Unicode 17 在 C 區新增了一字：

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEiaw84UrzNOs1mwWn6ZiD-7-7euxTyyPy6ZKku58MwD4M7PCllXMRYmD_d2nEOz10Ac3jcAVTayMgK2PtQb18_TFY-KG2G4GYPfPsgbnjL-ji1gnwV5Ph5lc4ST9suDZyUIYpiP9kS00b0WOyTFn8zzj1SvIi2vw2lC4foDOUYZg-CH8vzvi1ueB4F8plI)(https://blogger.googleusercontent.com/img/a/AVvXsEiaw84UrzNOs1mwWn6ZiD-7-7euxTyyPy6ZKku58MwD4M7PCllXMRYmD_d2nEOz10Ac3jcAVTayMgK2PtQb18_TFY-KG2G4GYPfPsgbnjL-ji1gnwV5Ph5lc4ST9suDZyUIYpiP9kS00b0WOyTFn8zzj1SvIi2vw2lC4foDOUYZg-CH8vzvi1ueB4F8plI)

即為此形，所以將其遷至 U+2B73E 並還 U+2F980 其原形。

對台標字形而言，這次 Unicode 17 還改動了「𪺘𫟂𭓱玥𣍟𦰶𣋰𣫲𥟌𧞰𩆬卑𠙴凵」等字的字形，各位可以稍加留意。但其中的 U+2F82D 原先的定義是：

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEgkCQCbXsdsx9liO8_lBC-tiLqo1et-5sGg1fcmRm3yKbMqkYXC00-B56O34qtuf6HAzVTTUaRagbiqd8jo6GxhPS1WIjs09egivclhSw3ziYixxrWW4-OERuhCMtT_nYgHG3i5iRNn_As-3qp2_ZfQgsa0tcm5wjBgj17n8jIIYRFEJdPycL12xIE1b_g)(https://blogger.googleusercontent.com/img/a/AVvXsEgkCQCbXsdsx9liO8_lBC-tiLqo1et-5sGg1fcmRm3yKbMqkYXC00-B56O34qtuf6HAzVTTUaRagbiqd8jo6GxhPS1WIjs09egivclhSw3ziYixxrWW4-OERuhCMtT_nYgHG3i5iRNn_As-3qp2_ZfQgsa0tcm5wjBgj17n8jIIYRFEJdPycL12xIE1b_g)

Unicode 17 改成：

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEh0q_vbjGlQVp2TjNBXcjAZNSNCQmJxf10-I3CBySa4gIGc3u3lldXVG4coBzrtJAXXO0awOns4265GV48QH-vTHi0hRX6sg5PfNvr-aTh1DGW_WXeOcOFQuJsWo4zNgzFFBlEZjx8zCwlikEi2CFH6lz4-kgzrSVFATLuGsm9qMx7fdYgyzgAodh0WHqI)(https://blogger.googleusercontent.com/img/a/AVvXsEh0q_vbjGlQVp2TjNBXcjAZNSNCQmJxf10-I3CBySa4gIGc3u3lldXVG4coBzrtJAXXO0awOns4265GV48QH-vTHi0hRX6sg5PfNvr-aTh1DGW_WXeOcOFQuJsWo4zNgzFFBlEZjx8zCwlikEi2CFH6lz4-kgzrSVFATLuGsm9qMx7fdYgyzgAodh0WHqI)

這字形與 F 區的 U+2D161 相衝：

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEj_AkP1SqEP2LTvazfZS2l8uCndMYBgg-4YUjwc3DA3C5MrQR9K66bLq4LB7VACRpLdEU64jZa746fdebZ5LJE8GHQShviy5Qi7PBF-CY2NlA0mkTwtfJMwIPcBvtUPIfFjz8jliO5uVhTRK2snqoQcBjAlycNBeXoJ-PrHn6uxB-7hHnPo5-nmLW20KX8)(https://blogger.googleusercontent.com/img/a/AVvXsEj_AkP1SqEP2LTvazfZS2l8uCndMYBgg-4YUjwc3DA3C5MrQR9K66bLq4LB7VACRpLdEU64jZa746fdebZ5LJE8GHQShviy5Qi7PBF-CY2NlA0mkTwtfJMwIPcBvtUPIfFjz8jliO5uVhTRK2snqoQcBjAlycNBeXoJ-PrHn6uxB-7hHnPo5-nmLW20KX8)

另外 U+20674 新增了 T 形的定義：

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEjG0qrm-rPmN498bS6uSMGS-ceOPSSSa6CBsLvlX5T4ZtqIjMllU0409TXgTLVz3H4tzOtNIeoZWcnmjqa9rWDR0sfLpyRI6RI59aPaOSoRfyxYHc0fmq67Ih6D-cUts13HztzFLL_thum5hKmDwGxNvluSpuggh2k-nRcXB5wFV-4QCx4at1tYLu-bcDc)(https://blogger.googleusercontent.com/img/a/AVvXsEjG0qrm-rPmN498bS6uSMGS-ceOPSSSa6CBsLvlX5T4ZtqIjMllU0409TXgTLVz3H4tzOtNIeoZWcnmjqa9rWDR0sfLpyRI6RI59aPaOSoRfyxYHc0fmq67Ih6D-cUts13HztzFLL_thum5hKmDwGxNvluSpuggh2k-nRcXB5wFV-4QCx4at1tYLu-bcDc)

而 U+2F81D 卻改成了一樣的字形：

【圖片】(https://blogger.googleusercontent.com/img/a/AVvXsEgrVoI91RD1M0yBii_lBVvFLmfIab94j4q_Ri5Lst5T4QCKKxCz4t7shZ7rLz3M0Mv1mPyOR8tY6TBax6OqJXRpuguiQnn-HiaabWKOseJf8XgREpss7fjW1Md16fBJoC_jCRQkF-mx5D5wI0xdNXCTSTz3OoSG6K0ekgeg20-u15CBz0EwmBrP4wABqD8)(https://blogger.googleusercontent.com/img/a/AVvXsEgrVoI91RD1M0yBii_lBVvFLmfIab94j4q_Ri5Lst5T4QCKKxCz4t7shZ7rLz3M0Mv1mPyOR8tY6TBax6OqJXRpuguiQnn-HiaabWKOseJf8XgREpss7fjW1Md16fBJoC_jCRQkF-mx5D5wI0xdNXCTSTz3OoSG6K0ekgeg20-u15CBz0EwmBrP4wABqD8)

我懷疑這幾處是 Unicode 的出版單位，在排版輸出時抓取的字形有問題，因此「全宋體」暫時依舊版而不改動，等問題釐清之後再做定奪。這些問題已經向 IRG 的朋友反應，不過據以往提供反饋的經驗，Unicode 官方並不會立刻做出修正，直到下次發布時才會更正。

## 字型更新

經過這些冗長繁複的整理，這次更新給大家的「全宋體」，除了基本字區、A 區、B 區、C 區(新增 6 字)、D 區、E 區(新增 12 字)、F 區、G 區、H 區、I 區、J 區(4298 字)的已編碼漢字共 102376 個外，再加上 100288 個 Unicode 尚未編碼的補充漢字，總計共有 202664 個漢字，正式突破了二十萬字。除了涵蓋 Unicode 17.0 的所有漢字之外，更涵蓋了四大字典的所有字頭與台灣 CNS 標準的編碼漢字以及漢字構形資料庫、《康熙字典》全文的所有漢字，足堪專業領域之使用。

下載連結：全宋體.zip(https://drive.google.com/file/d/1m0-WYAXbEz3lxJrti25ZvWv6LkHjMp2X/view?usp=sharing)

下載連結：部件檢索(測試版).7z(https://drive.google.com/file/d/1kCSZzPBndZNKyhTrsqLo58ZEChpFya5B/view?usp=sharing)

下載連結：倉頡碼表.7z(https://drive.google.com/file/d/1y74W62N-mIcl9r6H63oXkzV3aC4YDQRP/view?usp=sharing) (僅保留漢字部分，請自行併入您慣用的碼表)

## 鳴謝

感謝這些原字型製作單位的無私奉獻。

感謝老友 suns99 兄，總是不離不棄地與我並肩作戰。

感謝好友 jcz777 兄，協助部分字形造字與拆分數據的建立。

感謝新朋友 Xi Zhu 兄，提供部分避諱字資訊供我增補造字。

現將此成果無條件分享出來，樂見學術研究、教育工作、個人閱讀這方面的運用，但請勿用做任何形式的商業營利行為。希望「全宋體」這個大型字庫以及「部件檢索」這個檢字工具，能在漢字文化的整理、研究上幫上一點小忙。

**勘誤：**

---

## 留言選錄

**fivestone**（2025年9月14日 晚上8:05）：

感謝！可以去把玩新出的「男也」和「㐅也」了 lol

---

**WFG**（2025年9月16日 上午10:33）：

希望對您有所幫助。

---

**阿文**（2025年9月22日 清晨6:50）：

WFG‥

　　看了你文中所言‥

　　　　……將我製作的「數百部辭典」，進行遷碼的工作。

　　阿文不禁笑了起來！

　　編輯字詞典，果真會「著迷、成痴」啊！

　　阿文整編了‥

《臺語詞海》，目前收詞十一萬八千二千筆。

《臺語諺海》，目前收錄二萬六千多多多條。（每天繼續增加中。）

還真是「沒完沒了」啊！

　　今年，開始整編《漢文華臺字海》——想是這輩子，都做不完了！

　　最近有所感悟，故而寫了篇《論編輯》……

　　看來，咱們果真是（要）「毅力堅定，鞠躬盡瘁——死而後已」啦！

　　祝‥

和樂安康！

　　　　　　　　　　　　　　　　　　阿文

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

■部件檢索拆分錯誤

􇛏　手蹙 → 亻蹙

■字形錯誤

󽔌　虫𭅖 → 虫匚干（虫匚＠干）

《集韻》䖱：曲王切，音匡。《類篇》：大蝦也。

　※音「匡」，故當從匚。

《唐韻》作󽔌。󽔌字，作匚内干，不从王。

　https://zi.tools/zi/䖱

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

◎潘文良《漢字身分證》。2025.02.19.三　07:16:00

　https://www.facebook.com/groups/978821105480673/posts/9991096984252995/

◎潘文良整編《華臺字海》一

　https://www.facebook.com/groups/978821105480673/posts/10004425089586851/

◎潘文良《論編輯》。2025.09.20.六　20:00:00

　https://mypaper.pchome.com.tw/avun01/post/1382113958

---

**WFG**（2025年9月23日 下午2:28）：

阿文兄與我是一類人，都是不見棺材不停手呀，呵呵！

我這邊好多工作需要兄這樣的好手幫忙，因知兄不停在整編詞典，始終不敢相煩。最近開始在清理《高麗大藏經異體字字典》的字頭，第一批五千字已初定(共六批)，亟需好手協助建立拆分數據，兄若是整編詞典累了，想換個「口味」，歡迎趕緊來跳坑，哈哈！

􇛏　手蹙 → 亻蹙：此非「部件檢索」拆分錯誤，而是「漢字構形資料庫」的宋體字形錯了(楷體不誤)。這類錯誤還不少，我改了許多，但總還是有漏網之魚。我記得兄提過幫中研院造過一批字，不知是否是您當年經手的字形。

󽔌　虫𭅖 → 虫匚干（虫匚＠干）：我的字形無誤，所有从(匚＠干)的字形才是錯的。兄可以查查《玉篇》、《廣韻》、《集韻》、《篇海》等刻本的字形，看看是否如我所言。方成珪的《集韻考正》裏明確提到：「案：宋本凡『匡』字皆作『𭅖』，葢避廟諱也。此『匩』、『󵤗』譌『󱟚』、『𥮟』，據《說文》正。」段玉材亦云：「凡匡宋皆缺筆作𭅖。」所以這是避諱字的寫法，被許多人誤認為从(匚＠干)。這些證據我記在了勘誤裏，也通知官方來看，可是《教育部異體字字典》至今仍是不改。同樣的證據我也提供給一位 IRG 的朋友，可能他據此寫了報告，所以從 Unicode 16.0 開始，「𭅖」字大陸 G 源的字形已從(匚＠干)修正作(󰎀@王)了(可以看字統網「𭅖」字的記錄)。

---

**WFG**（2025年9月23日 下午2:57）：

再補充一字，「𥮟」字原从(匚@𡴀)，同樣自 Unicode 16.0 開始，大陸 G 源字形已經修正从(󰎀@𡉚)，這才是正確的。

---

**阿文**（2025年9月25日 清晨7:31）：

WFG‥

　　你就把《高麗大藏經異體字字典》的字頭，給寄來吧！

　　若還未建立「部首、筆畫、倉頡碼」等數據，阿文當一並處理。

　　上次留言，忘了一事‥

若「全宋體（等寬）」字型，「外字區」內的那些「楷體字」，沒用的話，

還請移除——另存「楷體暫存檔」去吧！

「外字區」，有「自造字」的，都會被它給「覆蓋掉」！

　　阿文也只能改用「全宋體（調和）」——

但凡英文、拼音，全都「擠在一起」，那「半形空格」，沒注意，還真難以辨識，實在挺不習慣的。

　　「󽔌」字形，原來是「忌避字」的關係啊！

　　突然想起，昔日與王志攀（《開放康熙字典》的製作者，已故）閑聊……

　　他說‥「避諱字，真是肢障字！」

　　阿文聽成「智障字」，一時不解，忽而會意，不禁笑道‥

「是啊！避諱字，把好好的漢字，都給整成了‥『斷手缺腳』的『肢障字』……

　還真搞不懂古人啊！有什麼好閃避、好忌諱的呢？」

（避諱字，或以「省筆、缺筆」為之，如「玄」改作「𤣥」、「句」改作「勾」。

　違李世民，世改為代，或略去、或缺筆作「𠀍」。

　民改為人，泯缺筆為「汦」；葉缺筆為「𦯧」〔內世改為充上半〕。

　愛新覺羅玄燁（世祖子），玄、曄、燁，清之避諱，自康熙帝之漢名始。）

　　既然「􇛏」字，當為「手部」，則須修正字形，並修正「倉頡碼」。

　　　　􇛏　扌蹙　倉頡碼：oifo → qifo

　　「􇛏」｛扌蹙｝字源：台灣閩南語用字注音總表。

【􇛏｛扌蹙｝】ㄑㄧㆦ　tshiook8

　⊕捉捏抓攪。 {例}􇛏鹹菜、􇛏麵粉、􇛏爛塗、􇛏爛糊糜仔（爛泥巴）。

　　　　　　＊　　　　　　＊　　　　　　＊　　　　　　＊

　　想起國中時，寫週記，阿文寫了‥

　　　　有朋自遠方來，不亦悅乎。

　　老師把「悅」字，圈了起來，改成「說」字，批曰‥

　　　　說通悅。

　　　　古人用「說」字，還是寫「說」字吧！

　　　　以示尊重。

　　阿文想想，笑道‥

「『說』通『悅』，但說字從言、悅字從心。

　『悅』者，心裡高興。

　『說』者，嘴裡說高興——心裡還未必，真的高興呢！

　有朋自遠方來，來『借錢』、來『討債』、來報仇找麻煩的……會高興嗎？

　原來這『不亦「說』乎』，暗藏玄機啊！」

　　阿文整編《漢文華臺字海》，不禁感慨‥

真會被「通同字」給打敗！

明明前人寫了「錯別字」，後人也得接受、承認，而謂之「通同字」——

而不能予以「訂正、更正」耶？

漢文字，還真是「不嫌多」啊！

想來，古人「造字」太方便了——毛筆寫一寫，也就有「新字」了！

所以才會有一堆「異體字」。

乃至「寫錯字（訛字）」，久而久之，也成了「新字」啦！

　　看來，哪天搞出「三十萬漢字」，也不無可能啊！

　　編輯尚未成功，同志仍須努力！

　　加油加油加加油……累了，要記得休息！

　　　　　　　　　　　　　　　　　　阿文

---

**WFG**（2025年9月25日 上午11:59）：

阿文兄慢了一步，第一批字頭昨晚已經給 jcz77 兄領了去，等第二批字頭清理出來，我再給您發過去。百忙之中仍願援手，萬分感謝！

倉頡碼 suns99 兄在清理時就已編好，但部首、筆畫我無力一一補上，兄願幫忙的話，我的漢字資料庫裏一堆字都缺，像是「漢字構形資料庫」來的字等等都缺部首、筆畫資訊，要是您有空，或許可以慢慢幫我補上。

外字區的字是我的疏忽，那是用來清理四庫全書缺字用的，發布前忘了刪除，現已更新，您重新下載即可。包含前述的字形錯誤都修正了，您往前捲到「勘誤」看看。

啊！志攀兄已仙去！與他僅一會之緣，沒想到已成絕響，真是不勝唏噓。

《高麗大藏經異體字典》估計會帶來一萬八千新字，這會為佛典的數位化有些幫助，這也是為「CBETA 缺字資料庫」的清理做預備。我幾次衝刺清理「CBETA」，都因父、母親的照護問題中斷了，只好迂迂迴迴，伺機再戰。

您我應當同年，眼力日衰，整編之餘也要照顧好自己。安好！

---

**王涛**（2025年9月28日 上午11:25）：

您好  我使用win11  用记事本打开您的测试文件 发现使用不同的安装字体 会有不同的方框   很奇怪  理论上换您的字体都应该显示  有的是j区  有的是i区

---

**阿文**（2025年9月28日 下午3:54）：

文中已有說明——

用Win11的記事本，載入會有問題；

用Win7以前的記本，就沒問題。

　　試著用用EmEditor等，文字編輯器吧！很好用的！

---

**阿文**（2025年9月28日 下午3:50）：

WFG‥

　　忙，倒是不忙——累，倒是真的累！

　　有時，早上開了電腦，想想，又不敢去開啟檔案，只怕一開啟，一投入整編，就又「忘了休息」；然後，想看看影片，躺到床上看（電腦桌，就在床邊，坐在床沿，就能打電腦），看著看著，就睡著了。

　　有時，一見螢幕，就「淚汪汪」（目油直流），也只能「休息多休息」啦！

　　所幸‥菜園裡，有除不完的雜草——三天、一星期，沒去理會，它就「荒草碧連天」啦！

　　沒想到，你還有與王志攀一會呀！

　　阿文與志攀，見了三次……

　　後來，也想找你等，幾個人聚聚的，因為「疫情」，也就擱下了。

　　疫情平緩後，志攀就病了～住院了……走了；然後，《開放康熙字典》的網頁，就在網際消失了——剩下的，也只能「懷念」啦！

　　志攀生前，說他在整編「十三經」，與《康熙字典》中的「書證」做連結——

應該是有完成吧！只是‥人走了，後繼無人，一切也就「結束」啦！

　　人生，也只能「盡其在我」，也不免會「齎志而終」，然後，學會「將遺憾，還諸天地」！

　　關於「漢字部首、筆畫」，那「七萬多字」的一批，阿文費心地，整編了《漢文字海》（包含‥部首、偏旁、外畫、總畫、拆分、倉頡碼、異體字、注音等）；後來的，也就「投降」啦——

蓋真不是「一個人」，幹得了、幹得完的！

又沒〈孫悟空〉的本領，可以變化出一堆「分身」，好能「分工合作」，

說個「急急如律令」，然後，三兩下子，也就能完成……

　　阿文想著‥到山下的「中華科技大學」，去找教「國文」的老師聊聊，

看看能不能搞個什麼計畫，向教育部，申請經費，花錢找工讀生幫忙整編——

只是‥至今還沒「行動」。

　　把檔案，上傳Google，想說‥或許可以弄個「協作平台」……

看來，網速太慢，還真「玩不了」哩！（上傳半天，一直斷線。）

　　反正這事，沒什麼「急迫性」，就「隨緣」吧！

　　你搞了那麼多部離線字詞典，又會寫程式——

當可將各部字詞典，現有的資料（部首、外畫、總畫等），一一取出，滙整為一個Excel資料檔——各詞典所缺的，有時間就補，沒時間，就罷啦！

　　今天，凌晨三點半，還睡不著，也就起來開電腦……

　　上午，下山去參與里內的「中秋節活動」，回來還挺累的，還是休息吧！

　　　　　　　　　　　　　　　　　　阿文

※見你在做《康熙字典》發表前的修校，附上一些「校記」，以供參考。

　（這是整編《漢文華臺字海》用的版本，非原來的康熙字典。

　　但有些，則是「一直錯著」的，如‥羊已→羊己；佬佬→侾佬。）

■附錄：康熙字典校記

【佭】

❶《字彙》胡江切，音降。〔平江〕

　{華}ㄒㄧㄤˊ　xiánɡ

【仿】

❶《集韻》符方切，音防。〔平陽〕

　{華}ㄈㄤˊ　fáng

　{台}{文}ㄏㆲˊ　hong5

　　　{白}ㄏㆭˊ　hng5

⊕游蕩、遨游、徘徊。

　⊙《集韻》仿佯：徙倚。或从彳作彷，通作方。

【仿】

❸《洪武正韻》蒲光切，音旁。〔平陽〕

　{華}ㄆㄤˊ　páng

　{台}ㄅㆲˊ　pong5

【佽】ㄑㄧˋ　qì

　→　ㄘˋ　cì

【腰】❶{華}ㄧㄠˋyào　→　ㄧㄠ　 yāo

【侂】❶音䟕。〔去禡〕　→　❶音托。〔入鐸〕 {華}ㄊㄨㄛ　tuō

【𠈨】❶音做。〔去箇〕　→　❶音作。〔入藥〕

【束】❷《韻會》春遇切；《周禮註疏》詩注切，𡘋音戍。〔去遇〕

【侴】敕久切　→　齒久切

【仅】❷《集韻》：農都切，音奴。〔平虞〕

　《集韻》：與帑同。　→　《集韻》：同奴。

【众】❶《篇海類編》：魚琴切，音吟。〔平侵〕 　{華}ㄧㄣˊ　yín 　{台}

　①眾立也。

　○與乑異。俗書為眾字，非。

【众】❷音眾。〔去送〕 　{華}ㄓㄨㄥˋ　zhòng 　{台}

　①「眾」字異體。亦作「衆」。

【伴】❶《廣韻》：蒲管切，盤上聲。〔上旱〕 　{華}ㄅㄢˋ　bàn

蒲管切→蒲旱切

上旱→上緩

【佁】❶《廣韻》：羊已切；《集韻》養里切，𡘋音以。

羊已→羊己

【但】

②又，語辭，猶言特也、第也，通作亶。詳前亶字註。

　𦯔→第

　古不知吹人　→　古之不工吹人

　氐→工

【𠈀】❶《海篇》：音似。〔平先〕

　〔平先〕→〔上紙〕

【𠈁】❶音魠。〔入藥〕

→❶音託。〔入藥〕

【侂】❶音䟕。〔去禡〕 　{華}ㄔㄚˋ　chà

→❶音託。〔入藥〕 　{華}ㄊㄨㄛ 　tuō

【𠇵】

❶《海篇》：音敢。〔上感〕 　{華}ㄍㄢˇ　gǎn

→❶《海篇》：音噉。〔去勘〕 　{華}ㄉㄢˋ　dàn

【來】

①撫其至日來。　日→曰

【佌】❷《廣韻》：想氏切，音徒。〔上紙〕

音徒→音徙

【佫】❶《廣韻》：曷各切，音鶴。〔入藥〕

→❶《廣韻》下各切；《集韻》曷各切，音鶴。〔入鐸匣〕

【佬】

①佬佬，大貌。　→　侾佬，大貌。

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

◎潘文良分享一則十年前的動態回顧。2025.01.22.三　10:11:00

　https://www.facebook.com/avun.pan/posts/pfbid02T2nJep7a4dJj3dbVJmbBhRU19suoCtnzu4FbFC3YLbjr4GTp52f6A325Wz7TzmPnl

◎0c-漢文字海.xlsx

　https://docs.google.com/spreadsheets/d/1j_fTSMnSTX00rbt8IDaOLK30CFrqQns9/edit?usp=sharing&ouid=107308403060082571818&rtpof=true&sd=true

◎漢字拆分倉頡碼.ods

 https://drive.google.com/file/d/1UcRzl7qU9jspfcoc9vXU_n8_Tj3o8Q7v/view?usp=sharing

---

**WFG**（2025年9月30日 下午5:01）：

《高麗大藏經異體字典》的第二批字頭剛剛出爐了，已經給阿文兄發過去，有勞阿文兄幫忙。

---

**阿文**（2025年10月7日 上午11:29）：

《麗藏異體字典》之字頭，已完成拆分～寄送。

　　請修訂「拆分、倉頡碼」，省得每次更新，阿文就自行更改。

　　◎拆分校記

􇛸：在⼂;󰐨圡　※「在⼂」，直觀先選，一般人，應讓不會「󰐨圡」。

　　　　　　　　　「􇛸」〔ㄉㆤ'ㆷ　teh8〕吳守禮台語。

　　◎倉頡碼校記

𫞕 hvpi　→　hvpi;hvip

黄 twc　→　tmwc;twc

丗　tj　→　tjm　（卅：tj　一：m。）

󵏦　qb　→　bq　（如「𭁠」〔bq〕，先寫「冂」，再寫「𰀁」。或改：bq;qb。）

󵏷　mqb　→　mbq

󰓶　n　→　hn　（㇒＋𪛙）或改：hn;n。　⺈（hn）

𠫰 iiim　→　iimmm;iiim

囗 r;w　→　bm;w;r　※舊倉頡做󰒂一 bm

　　◎康熙字典校記

【㑜】❶《集韻》丑制切，音跇。〔去霽〕　→　丑例切

　※《集韻》跇：丑例切、以制切、之列切。

【㑟】ㄅㄧㄥˇ　bǐng　→　ㄅㄥˇ　běng

---

**WFG**（2025年10月9日 中午12:22）：

辛苦了，感謝！

合於字理的拆分才有學術上的意義，所以原則上先列。「在⼂」的拆法不合字理，只算俗拆，可以補充在後。倉頡碼都是由 suns99 兄編訂、維護，一些拆字的看法可能與兄存在歧異。

---

**思橘**（2026年1月19日 上午8:51）：

感謝感謝，實時更新太厲害了！

能不能請您發到github倉庫裏，這樣就可以通過css文件鏈接到github倉庫供obsidian多終端使用了。而且每次您的脩正都可以實時連網更新。如果轉成base64複製入css裏手機存儲佔用會很大。

---

**WFG**（2026年1月19日 下午5:17）：

很抱歉，我尚未使用 github。目前也正全力在整理《高麗大藏經異體字典》的缺字，估計得忙上大半年，暫時無力旁顧其他了。

---

**思橘**（2026年1月21日 上午11:38）：

我也衹是建議，您按您的計劃來。

git提供免費的文件託管和版本控制服務，其實非常好用。本地任意資料夾中的任意文件的任意改動，都可以

```

git add .

git commit -m "變更聲朙"

git push

```

三條命令推上雲端，提供備份和版本管理。用來備份筆記、整理的數據、小文件等……都挺好的。

---

**白泡泡**（2026年2月5日 上午11:29）：

您好，冒昧留言打擾。

我是 CBETA 電子佛典基金會的工作人員，長期關注並受益於您製作的全宋體字型，在佛典顯示與缺字處理上幫助很大，特此致謝。

近日有一項與全宋體相關的使用與標示事宜，希望能向您私下請教幾個問題。

不知是否方便以電子郵件方式聯繫？

感謝您撥冗閱讀留言，敬祝安好。

---

**WFG**（2026年2月6日 上午10:04）：

歡迎聯繫，先前曾與貴會的 heaven 兄電子郵件聯繫討論過一陣子，不知是否與您同單位？如果不是，您可以在這裡再次留言留下您的電子郵件信箱，然後立刻刪除，我收到通知後會與您聯繫。
