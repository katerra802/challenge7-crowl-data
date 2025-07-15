const fs = require('fs');
const path = require('path');

const logFolder = path.join(__dirname, '../../logs');

// Tạo thư mục logs nếu chưa có
if (!fs.existsSync(logFolder)) {
    fs.mkdirSync(logFolder, { recursive: true });
}

// Hàm ghi log
const logMessage = (message) => {
    const now = new Date();

    // Định dạng ngày ddMMyyyy
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // tháng bắt đầu từ 0
    const year = now.getFullYear();

    const dateStr = `${day}${month}${year}`;

    const logFile = path.join(logFolder, `log_${dateStr}.log`);

    const logLine = `[${now.toISOString()}] ${message}\n`;

    // Append log vào file
    fs.appendFileSync(logFile, logLine, 'utf8');
};

module.exports = {
    logMessage
};
