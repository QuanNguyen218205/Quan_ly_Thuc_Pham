-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th10 25, 2026 lúc 03:06 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `food_management`
--

DELIMITER $$
--
-- Thủ tục
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_use_food` (IN `p_item_id` INT, IN `p_quantity_used` DECIMAL(10,2), IN `p_reason` VARCHAR(255))   BEGIN
    DECLARE v_curr_qty DECIMAL(10,2);
    DECLARE v_new_qty DECIMAL(10,2);
    DECLARE v_food_name VARCHAR(150);

    -- Lấy tồn kho hiện tại
    SELECT fi.current_quantity, f.food_name 
    INTO v_curr_qty, v_food_name
    FROM food_items fi
    JOIN foods f ON fi.food_id = f.food_id
    WHERE fi.item_id = p_item_id;

    IF v_curr_qty IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Không tìm thấy món này trong kho!';
    END IF;

    IF v_curr_qty < p_quantity_used THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Số lượng sử dụng lớn hơn tồn kho thực tế!';
    END IF;

    SET v_new_qty = v_curr_qty - p_quantity_used;

    -- Thêm vào lịch sử giao dịch -> Trigger sẽ tự động cập nhật số lượng và trạng thái của food_items
    INSERT INTO inventory_transactions (item_id, action_type, change_quantity, remaining_quantity, reason, transaction_time)
    VALUES (p_item_id, 'Sử dụng', -p_quantity_used, v_new_qty, p_reason, NOW());

    -- Trả kết quả hiển thị cho người dùng
    SELECT 
        'Thành công' AS `trang_thai`,
        v_food_name AS `ten_thuc_pham`,
        p_quantity_used AS `so_luong_da_dung`,
        v_new_qty AS `so_luong_con_lai`,
        IF(v_new_qty <= 0, 'Đã hết', 'Đang sử dụng') AS `trang_thai_kho`;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `categories`
--

CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `categories`
--

INSERT INTO `categories` (`category_id`, `category_name`, `description`) VALUES
(1, 'Rau củ', 'Các loại rau xanh, củ, quả tươi sống'),
(2, 'Thịt & Hải sản', 'Thịt lợn, bò, gà và thủy hải sản'),
(3, 'Trứng & Sữa', 'Trứng, sữa tươi, sữa chua, phô mai'),
(4, 'Đồ đông lạnh', 'Đồ đông đá, kem, đá viên'),
(5, 'Đồ khô & Đồ hộp', 'Đồ hộp, mì gói, ngũ cốc'),
(6, 'Gia vị', 'Mắm, muối, đường, tiêu, hạt nêm'),
(7, 'Đồ uống & Trái cây', 'Nước ngọt, nước ép, hoa quả tươi');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `foods`
--

CREATE TABLE `foods` (
  `food_id` int(11) NOT NULL,
  `food_code` varchar(50) NOT NULL,
  `food_name` varchar(150) NOT NULL,
  `category_id` int(11) NOT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `foods`
--

INSERT INTO `foods` (`food_id`, `food_code`, `food_name`, `category_id`, `brand`, `image_url`, `description`, `created_at`) VALUES
(1, 'TP001', 'Sữa tươi thanh trùng Vinamilk', 3, 'Vinamilk', NULL, 'Hộp 1 lít tiệt trùng', '2026-10-25 21:02:40'),
(2, 'TP002', 'Thịt ba chỉ heo', 2, 'MeatDeli', NULL, 'Thịt heo sạch đóng khay', '2026-10-25 21:02:40'),
(3, 'TP003', 'Rau xà lách mỡ Đà Lạt', 1, 'Đà Lạt Farm', NULL, 'Rau tươi Đà Lạt', '2026-10-25 21:02:40'),
(4, 'TP004', 'Cá hồi Na Uy phi lê', 2, 'Nordic', NULL, 'Cá hồi tươi phi lê', '2026-10-25 21:02:40'),
(5, 'TP005', 'Sữa chua nha đam Vinamilk', 3, 'Vinamilk', NULL, 'Lốc 4 hộp', '2026-10-25 21:02:40'),
(6, 'TP006', 'Trứng gà ta Ba Huân', 3, 'Ba Huân', NULL, 'Hộp 10 quả', '2026-10-25 21:02:40');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `food_items`
--

CREATE TABLE `food_items` (
  `item_id` int(11) NOT NULL,
  `food_id` int(11) NOT NULL,
  `location_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `current_quantity` decimal(10,2) NOT NULL DEFAULT 0.00,
  `min_threshold` decimal(10,2) NOT NULL DEFAULT 1.00,
  `import_date` date NOT NULL,
  `expiration_date` date NOT NULL,
  `status` enum('Đang sử dụng','Đã hết','Đã hủy') NOT NULL DEFAULT 'Đang sử dụng',
  `notes` varchar(255) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `food_items`
--

INSERT INTO `food_items` (`item_id`, `food_id`, `location_id`, `unit_id`, `current_quantity`, `min_threshold`, `import_date`, `expiration_date`, `status`, `notes`, `updated_at`) VALUES
(1, 1, 1, 6, 1.00, 1.00, '2026-10-20', '2026-10-26', 'Đang sử dụng', 'Cần uống gấp', '2026-10-25 21:02:40'),
(2, 3, 3, 1, 0.50, 0.20, '2026-10-23', '2026-10-27', 'Đang sử dụng', 'Ăn trong hôm nay/mai', '2026-10-25 21:02:40'),
(3, 2, 2, 1, 0.80, 0.50, '2026-10-24', '2026-10-28', 'Đang sử dụng', 'Nấu bữa tối', '2026-10-25 21:02:40'),
(4, 5, 1, 6, 4.00, 2.00, '2026-10-25', '2026-11-04', 'Đang sử dụng', 'Mới mua', '2026-10-25 21:02:40'),
(5, 4, 4, 1, 1.20, 0.50, '2026-10-22', '2026-11-24', 'Đang sử dụng', 'Dự trữ', '2026-10-25 21:02:40'),
(6, 6, 5, 5, 2.00, 4.00, '2026-10-21', '2026-11-09', 'Đang sử dụng', 'Sắp hết trứng', '2026-10-25 21:02:40');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `inventory_transactions`
--

CREATE TABLE `inventory_transactions` (
  `transaction_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `action_type` enum('Nhập thêm','Sử dụng','Điều chỉnh','Vứt hủy') NOT NULL,
  `change_quantity` decimal(10,2) NOT NULL,
  `remaining_quantity` decimal(10,2) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `transaction_time` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Bẫy `inventory_transactions`
--
DELIMITER $$
CREATE TRIGGER `trg_after_inventory_transaction` AFTER INSERT ON `inventory_transactions` FOR EACH ROW BEGIN
    UPDATE `food_items`
    SET `current_quantity` = NEW.remaining_quantity,
        `status` = CASE 
            WHEN NEW.remaining_quantity <= 0 THEN 'Đã hết'
            ELSE 'Đang sử dụng'
        END
    WHERE `item_id` = NEW.item_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `storage_locations`
--

CREATE TABLE `storage_locations` (
  `location_id` int(11) NOT NULL,
  `area_type` enum('Trong tủ lạnh','Ngoài tủ lạnh') NOT NULL,
  `location_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `storage_locations`
--

INSERT INTO `storage_locations` (`location_id`, `area_type`, `location_name`, `description`) VALUES
(1, 'Trong tủ lạnh', 'Ngăn mát tầng trên', 'Nhiệt độ 2-4 độ C, bảo quản sữa, đồ chín'),
(2, 'Trong tủ lạnh', 'Ngăn mát tầng dưới', 'Nhiệt độ 3-5 độ C, bảo quản đồ tươi sống'),
(3, 'Trong tủ lạnh', 'Hộc đựng rau củ', 'Độ ẩm cao, giữ rau củ tươi lâu'),
(4, 'Trong tủ lạnh', 'Ngăn đông đá', 'Nhiệt độ âm, đông lạnh dài hạn'),
(5, 'Trong tủ lạnh', 'Hộc cánh tủ lạnh', 'Bảo quản trứng, đồ uống, sốt'),
(6, 'Ngoài tủ lạnh', 'Kệ gia vị bếp', 'Nơi khô ráo để các hũ gia vị'),
(7, 'Ngoài tủ lạnh', 'Tủ bếp trên', 'Để thực phẩm khô, mì gói, đồ hộp'),
(8, 'Ngoài tủ lạnh', 'Rổ hoa quả bàn ăn', 'Để trái cây ăn ngay');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `system_settings`
--

CREATE TABLE `system_settings` (
  `setting_id` int(11) NOT NULL,
  `setting_key` varchar(50) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `system_settings`
--

INSERT INTO `system_settings` (`setting_id`, `setting_key`, `setting_value`, `description`) VALUES
(1, 'timezone', 'Asia/Ho_Chi_Minh', 'Múi giờ chuẩn hệ thống'),
(2, 'warning_days_threshold', '3', 'Ngưỡng cảnh báo sắp hết hạn (<= 3 ngày)'),
(3, 'min_quantity_default', '1.0', 'Mức tồn kho tối thiểu');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `units`
--

CREATE TABLE `units` (
  `unit_id` int(11) NOT NULL,
  `unit_name` varchar(50) NOT NULL,
  `description` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `units`
--

INSERT INTO `units` (`unit_id`, `unit_name`, `description`) VALUES
(1, 'kg', 'Kilogram'),
(2, 'g', 'Gram'),
(3, 'lít', 'Lít'),
(4, 'ml', 'Mililit'),
(5, 'quả', 'Quả/Trái'),
(6, 'hộp', 'Hộp/Lốc'),
(7, 'gói', 'Gói'),
(8, 'chai', 'Chai');

-- --------------------------------------------------------

--
-- Cấu trúc đóng vai cho view `view_alerts`
-- (See below for the actual view)
--
CREATE TABLE `view_alerts` (
`item_id` int(11)
,`ten_thuc_pham` varchar(150)
,`loai` varchar(100)
,`vi_tri` varchar(100)
,`so_luong_hien_tai` decimal(10,2)
,`nguong_toi_thieu` decimal(10,2)
,`don_vi` varchar(50)
,`han_dung` date
,`so_ngay_con_lai` int(7)
,`loai_canh_bao` varchar(25)
);

-- --------------------------------------------------------

--
-- Cấu trúc đóng vai cho view `view_fefo_recommendations`
-- (See below for the actual view)
--
CREATE TABLE `view_fefo_recommendations` (
`item_id` int(11)
,`ma_thuc_pham` varchar(50)
,`ten_thuc_pham` varchar(150)
,`loai_thuc_pham` varchar(100)
,`khu_vuc` enum('Trong tủ lạnh','Ngoài tủ lạnh')
,`vi_tri_luu_tru` varchar(100)
,`so_luong_ton` decimal(10,2)
,`don_vi_tinh` varchar(50)
,`ngay_nhap` date
,`han_su_dung` date
,`so_ngay_con_lai` int(7)
,`muc_do_uu_tien` varchar(18)
,`hanh_dong_de_xuat` varchar(33)
);

-- --------------------------------------------------------

--
-- Cấu trúc cho view `view_alerts`
--
DROP TABLE IF EXISTS `view_alerts`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_alerts`  AS SELECT `fi`.`item_id` AS `item_id`, `f`.`food_name` AS `ten_thuc_pham`, `c`.`category_name` AS `loai`, `sl`.`location_name` AS `vi_tri`, `fi`.`current_quantity` AS `so_luong_hien_tai`, `fi`.`min_threshold` AS `nguong_toi_thieu`, `u`.`unit_name` AS `don_vi`, `fi`.`expiration_date` AS `han_dung`, to_days(`fi`.`expiration_date`) - to_days(curdate()) AS `so_ngay_con_lai`, CASE WHEN to_days(`fi`.`expiration_date`) - to_days(curdate()) < 0 THEN 'CẢNH BÁO: ĐÃ HẾT HẠN' WHEN to_days(`fi`.`expiration_date`) - to_days(curdate()) <= 3 THEN 'CẢNH BÁO: SẮP HẾT HẠN' WHEN `fi`.`current_quantity` <= `fi`.`min_threshold` THEN 'CẢNH BÁO: SẮP HẾT TỒN KHO' ELSE 'BÌNH THƯỜNG' END AS `loai_canh_bao` FROM ((((`food_items` `fi` join `foods` `f` on(`fi`.`food_id` = `f`.`food_id`)) join `categories` `c` on(`f`.`category_id` = `c`.`category_id`)) join `storage_locations` `sl` on(`fi`.`location_id` = `sl`.`location_id`)) join `units` `u` on(`fi`.`unit_id` = `u`.`unit_id`)) WHERE `fi`.`status` = 'Đang sử dụng' AND (to_days(`fi`.`expiration_date`) - to_days(curdate()) <= 3 OR `fi`.`current_quantity` <= `fi`.`min_threshold`) ;

-- --------------------------------------------------------

--
-- Cấu trúc cho view `view_fefo_recommendations`
--
DROP TABLE IF EXISTS `view_fefo_recommendations`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_fefo_recommendations`  AS SELECT `fi`.`item_id` AS `item_id`, `f`.`food_code` AS `ma_thuc_pham`, `f`.`food_name` AS `ten_thuc_pham`, `c`.`category_name` AS `loai_thuc_pham`, `sl`.`area_type` AS `khu_vuc`, `sl`.`location_name` AS `vi_tri_luu_tru`, `fi`.`current_quantity` AS `so_luong_ton`, `u`.`unit_name` AS `don_vi_tinh`, `fi`.`import_date` AS `ngay_nhap`, `fi`.`expiration_date` AS `han_su_dung`, to_days(`fi`.`expiration_date`) - to_days(curdate()) AS `so_ngay_con_lai`, CASE WHEN to_days(`fi`.`expiration_date`) - to_days(curdate()) < 0 THEN 'Đã hết hạn' WHEN to_days(`fi`.`expiration_date`) - to_days(curdate()) <= 2 THEN 'Ưu tiên Cao' WHEN to_days(`fi`.`expiration_date`) - to_days(curdate()) <= 7 THEN 'Ưu tiên Trung bình' ELSE 'Ưu tiên Thấp' END AS `muc_do_uu_tien`, CASE WHEN to_days(`fi`.`expiration_date`) - to_days(curdate()) < 0 THEN 'Cần thanh lý/bỏ khỏi tủ' WHEN to_days(`fi`.`expiration_date`) - to_days(curdate()) <= 2 THEN 'Sắp hết hạn, nấu ngay hôm nay/mai' WHEN to_days(`fi`.`expiration_date`) - to_days(curdate()) <= 7 THEN 'Dự kiến dùng trong tuần' ELSE 'Bảo quản tiếp tục' END AS `hanh_dong_de_xuat` FROM ((((`food_items` `fi` join `foods` `f` on(`fi`.`food_id` = `f`.`food_id`)) join `categories` `c` on(`f`.`category_id` = `c`.`category_id`)) join `storage_locations` `sl` on(`fi`.`location_id` = `sl`.`location_id`)) join `units` `u` on(`fi`.`unit_id` = `u`.`unit_id`)) WHERE `fi`.`status` = 'Đang sử dụng' AND `fi`.`current_quantity` > 0 ORDER BY `fi`.`expiration_date` ASC, `fi`.`import_date` ASC ;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `category_name` (`category_name`);

--
-- Chỉ mục cho bảng `foods`
--
ALTER TABLE `foods`
  ADD PRIMARY KEY (`food_id`),
  ADD UNIQUE KEY `food_code` (`food_code`),
  ADD KEY `fk_foods_categories` (`category_id`);

--
-- Chỉ mục cho bảng `food_items`
--
ALTER TABLE `food_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `fk_items_foods` (`food_id`),
  ADD KEY `fk_items_locations` (`location_id`),
  ADD KEY `fk_items_units` (`unit_id`);

--
-- Chỉ mục cho bảng `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `fk_transactions_items` (`item_id`);

--
-- Chỉ mục cho bảng `storage_locations`
--
ALTER TABLE `storage_locations`
  ADD PRIMARY KEY (`location_id`);

--
-- Chỉ mục cho bảng `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Chỉ mục cho bảng `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`unit_id`),
  ADD UNIQUE KEY `unit_name` (`unit_name`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT cho bảng `foods`
--
ALTER TABLE `foods`
  MODIFY `food_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `food_items`
--
ALTER TABLE `food_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `storage_locations`
--
ALTER TABLE `storage_locations`
  MODIFY `location_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `setting_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `units`
--
ALTER TABLE `units`
  MODIFY `unit_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `foods`
--
ALTER TABLE `foods`
  ADD CONSTRAINT `fk_foods_categories` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `food_items`
--
ALTER TABLE `food_items`
  ADD CONSTRAINT `fk_items_foods` FOREIGN KEY (`food_id`) REFERENCES `foods` (`food_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_items_locations` FOREIGN KEY (`location_id`) REFERENCES `storage_locations` (`location_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_items_units` FOREIGN KEY (`unit_id`) REFERENCES `units` (`unit_id`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  ADD CONSTRAINT `fk_transactions_items` FOREIGN KEY (`item_id`) REFERENCES `food_items` (`item_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
