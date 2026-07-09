const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Cấu hình kết nối tới MySQL của Aiven Đám Mây
const db = mysql.createConnection({
    host: 'webbiphim-lebinhpro2005-3c67.j.aivencloud.com',
    port: 14241,
    user: 'avnadmin',
    password: 'AVNS_lMUB3EJYvSZL4SaqpZ_',
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối MySQL: ' + err.message);
        return;
    }
    console.log('Chúc mừng! Đã kết nối thành công tới Database MySQL.');
});

// 2. API: Lấy danh sách phim từ Database
app.get('/api/phim', (req, res) => {
    const sqlQuery = "SELECT * FROM phim";
    db.query(sqlQuery, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(data);
    });
});

// 3. API: Đăng ký tài khoản
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    const sqlQuery = "INSERT INTO nguoidung (username, password) VALUES (?, ?)";
    
    db.query(sqlQuery, [username, password], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: "Tên đăng nhập đã tồn tại!" });
            }
            return res.status(500).json({ error: err.message });
        }
        return res.status(201).json({ message: "Đăng ký thành công!" });
    });
});

// 4. API: Đăng nhập hệ thống (ĐÃ CẬP NHẬT TRẢ VỀ USERID ĐỘNG)
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const sqlQuery = "SELECT * FROM nguoidung WHERE username = ? AND password = ?";
    
    db.query(sqlQuery, [username, password], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        if (data.length === 0) return res.status(400).json({ message: "Sai tài khoản hoặc mật khẩu!" });
        
        // TRẢ VỀ CẢ USERNAME VÀ ID ĐỂ PHÂN TÁCH LỊCH SỬ XEM PHIM TRÊN FRONT-END
        return res.json({ 
            message: "Đăng nhập thành công!", 
            user: data[0].username,
            userId: data[0].id // <-- QUAN TRỌNG: Thêm trường này để lưu vào localStorage
        });
    });
});

// 5. API: Lưu lịch sử xem phim
app.post('/api/lichsu', (req, res) => {
    const { user_id, phim_id } = req.body;
    if (!user_id || !phim_id) {
        return res.status(400).json({ message: "Thiếu thông tin để lưu lịch sử!" });
    }
    const sqlQuery = "INSERT INTO lichsu (user_id, phim_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE thoigian = CURRENT_TIMESTAMP";
    
    db.query(sqlQuery, [user_id, phim_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json({ message: "Đã lưu lịch sử xem phim thành công!" });
    });
});

// 6. API: Lấy danh sách lịch sử xem phim của từng User
app.get('/api/lichsu/:user_id', (req, res) => {
    const { user_id } = req.params;
    const sqlQuery = `
        SELECT ls.thoigian, p.id, p.ten, p.anh, p.loai, p.chatLuong 
        FROM lichsu ls 
        JOIN phim p ON ls.phim_id = p.id 
        WHERE ls.user_id = ? 
        ORDER BY ls.thoigian DESC`;
        
    db.query(sqlQuery, [user_id], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(data);
    });
});

// Chạy server tại cổng 5000
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Máy chủ Back-end đang chạy tại luồng: http://localhost:${PORT}`);
});
app.post('/api/nap-tien', (req, res) => {
    const { userId, soTien } = req.body;
    const sql = "UPDATE nguoidung SET tien_ao = tien_ao + ? WHERE id = ?";
    db.query(sql, [soTien, userId], (err, result) => {
        if(err) return res.status(500).send(err);
        res.send({ message: "Nạp tiền thành công!" });
    });
});
// API Nạp tiền
app.post('/api/nap-tien', (req, res) => {
    const { userId, soTien } = req.body;
    db.query("UPDATE nguoidung SET tien_ao = tien_ao + ? WHERE id = ?", [soTien, userId], (err, result) => {
        if(err) return res.status(500).send(err);
        res.send({ message: "Nạp tiền thành công!" });
    });
});

// API Mua gói VIP (100.000 xu)
app.post('/api/mua-vip', (req, res) => {
    const { userId } = req.body;
    // Kiểm tra và trừ tiền, đồng thời nâng cấp tài khoản
    const sql = "UPDATE nguoidung SET tien_ao = tien_ao - 100000, loai_tk = 'vip' WHERE id = ? AND tien_ao >= 100000";
    db.query(sql, [userId], (err, result) => {
        if(result.affectedRows > 0) res.send({ success: true });
        else res.send({ success: false, message: "Không đủ tiền hoặc lỗi!" });
    });
});