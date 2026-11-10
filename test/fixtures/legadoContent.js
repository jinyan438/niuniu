const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><text>99+</text></svg>').toString('base64');
const paragraphControl = `<img src="data:image/svg+xml;base64,${svg},{"js":"showCmt('https://books.test/get_para_review?book_id=123&para=1', '番茄' ,'段评')","style":"text"}">`;
const chapterControl = `<img src="https://books.test/chapter_review_svg?book_id=123&img=1,{'type':'qtbzs',"js":"showFanqieComment('https://books.test/fanqie_comment?mode=chapter','本章说')",'style':'FULL'}">`;

function escapeMarkup(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

module.exports = { paragraphControl, chapterControl, escapeMarkup };
