const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==================== CẤU HÌNH KẾT NỐI GÁN CỨNG MẬT KHẨU THỦ CÔNG ====================
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'mysql-biphim-webbiphim.a.aivencloud.com',
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD || 'AVNS_lMUB3EJYvSZL4SaqpZ_', // Đã điền mật khẩu thủ công của Long
    database: process.env.DB_NAME || 'defaultdb',
    port: process.env.DB_PORT || 11345,
    ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối MySQL trên mây Aiven:', err.message);
    } else {
        console.log('Kết nối thành công Cơ sở dữ liệu đám mây MySQL 8.4!');
    }
});

// ==================== API LẤY DANH SÁCH TẤT CẢ PHIM ====================
app.get('/api/phim', (req, res) => {
    db.query("SELECT * FROM phim", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==================== API ĐĂNG KÝ VIP THÀNH VIÊN ====================
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Vui lòng nhập đủ tài khoản và mật khẩu!" });
    }

    db.query("SELECT * FROM nguoidung WHERE username = ?", [username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            return res.status(400).json({ message: "Tên tài khoản VIP này đã tồn tại!" });
        }

        const sql = "INSERT INTO nguoidung (username, password) VALUES (?, ?)";
        db.query(sql, [username, password], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Chúc mừng! Bạn đã đăng ký tài khoản VIP thành công!" });
        });
    });
});

// ==================== API ĐĂNG NHẬP CHUẨN ĐỒNG BỘ ID ====================
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.query("SELECT * FROM nguoidung WHERE username = ? AND password = ?", [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length > 0) {
            const user = results[0];
            res.json({ 
                message: "Đăng nhập thành công tài khoản VIP!", 
                user: user.username,
                userId: user.id 
            });
        } else {
            res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu VIP!" });
        }
    });
});

// ==================== API LƯU LỊCH SỬ XEM PHIM BẤT ĐỒNG BỘ ====================
app.post('/api/lichsu', (req, res) => {
    const { user_id, phim_id } = req.body;
    if (!user_id || !phim_id) {
        return res.status(400).json({ message: "Thiếu thông tin đồng bộ lịch sử!" });
    }
    const sql = "INSERT INTO lichsu (user_id, phim_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE thoigian = CURRENT_TIMESTAMP";
    db.query(sql, [user_id, phim_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Hệ thống đám mây đã ghi nhận lịch sử xem phim!" });
    });
});

// ==================== API LẤY LỊCH SỬ THEO ĐÚNG ID TÀI KHOẢN ====================
app.get('/api/lichsu/:user_id', (req, res) => {
    const { user_id } = req.params;
    const sql = `
        SELECT ls.thoigian, p.id, p.ten, p.anh, p.loai, p.chatLuong 
        FROM lichsu ls 
        JOIN phim p ON ls.phim_id = p.id 
        WHERE ls.user_id = ? 
        ORDER BY ls.thoigian DESC`;
    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==================== API LẤY THÔNG TIN AVATAR VÀ USERNAME TỪ MÂY ====================
app.get('/api/user/:id', (req, res) => {
    const { id } = req.params;
    db.query("SELECT id, username, avatar FROM nguoidung WHERE id = ?", [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy dữ liệu user" });
        res.json(results[0]);
    });
});

// KÍCH HOẠT SERVER CỔNG ĐÁM MÂY
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Máy chủ đang chạy mượt mà tại cổng: ${PORT}`);
});