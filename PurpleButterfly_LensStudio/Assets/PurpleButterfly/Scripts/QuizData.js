// 紫蝶奇遇記 — 三題是非題（O / X）
// 題目是三張說明圖（Art/q1_banner.png ~ q3_banner.png），圖上的文字就是題目；
// statement 是同一段文字，給測試和無障礙使用。
// answer: true = O（正確）, false = X（錯誤）

module.exports = {
  title: "紫蝶奇遇記",
  intro: {
    heading: "你能變成紫斑蝶嗎？",
    body:
      "站在鏡頭前，判斷每一題是 O 還是 X。\n全部答對：你會變成紫斑蝶！\n只要答錯：你會變成牛糞……"
  },

  questions: [
    {
      id: "Q1",
      banner: "q1_banner.png",
      statement: "台灣的紫斑蝶會在每年春天集體北返，飛牛牧場也是牠們重要的中繼站之一。",
      answer: true,
      explain: "紫斑蝶春天會集體北返，飛牛牧場是牠們重要的中繼站之一。"
    },
    {
      id: "Q2",
      banner: "q2_banner.png",
      statement: "紫斑蝶跟大多數蝴蝶一樣，整個冬天都會留在苗栗飛牛牧場過冬，不會進行長途遷徙。",
      answer: false,
      explain: "紫斑蝶和大多數蝴蝶不一樣：冬天會成群往南遷移，到溫暖避風的山谷越冬，不是整個冬天都留在飛牛牧場。"
    },
    {
      id: "Q3",
      banner: "q3_banner.png",
      statement: "飛牛牧場內種植了許多紫斑蝶喜歡的蜜源與食草植物，因此常能觀察到牠們的蹤跡。",
      answer: true,
      explain: "牧場裡有蜜源植物（成蝶吸蜜）和食草植物（幼蟲吃葉子），所以常常能看到紫斑蝶。"
    }
  ],

  win: {
    title: "你變成紫斑蝶了！",
    body: "三題全對！飛牛牧場歡迎你，春天一起北返吧。",
    image: "img_butterfly.png"
  },
  lose: {
    title: "你變成牛糞了……",
    body: "答對 {score} / {total} 題。再挑戰一次，全對就能變成紫斑蝶！",
    image: "img_dung.png"
  }
};
