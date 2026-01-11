# Hướng dẫn setup Mapbox GL JS

## Mapbox GL JS là gì?

Mapbox GL JS là một thư viện map hiện đại, mạnh mẽ với:
- ✅ Performance cao
- ✅ Customizable styles
- ✅ 3D maps support
- ✅ Free tier: 50,000 map loads/tháng

## Cách lấy Mapbox Access Token MIỄN PHÍ

### Bước 1: Tạo Mapbox Account
1. Truy cập: https://account.mapbox.com/auth/signup/
2. Đăng ký tài khoản miễn phí (có thể dùng Google/GitHub)

### Bước 2: Lấy Access Token
1. Sau khi đăng nhập, vào: https://account.mapbox.com/access-tokens/
2. Bạn sẽ thấy **Default public token** (có thể dùng ngay)
3. Hoặc tạo token mới:
   - Click **Create a token**
   - Đặt tên token (ví dụ: "EventMap")
   - Chọn scopes: `styles:read`, `fonts:read`
   - Click **Create token**
   - Copy token

### Bước 3: Cập nhật vào project
1. Mở file `.env`
2. Tìm dòng `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
3. Cập nhật với token của bạn:
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="your-token-here"
   ```

## Free Tier Limits
- **50,000 map loads/tháng** - Đủ cho hầu hết ứng dụng
- **Unlimited** geocoding requests
- **Unlimited** directions requests

## Map Styles có sẵn

Bạn có thể thay đổi style trong `MapComponent.tsx`:

```typescript
style: 'mapbox://styles/mapbox/streets-v12'     // Streets (default)
style: 'mapbox://styles/mapbox/outdoors-v12'    // Outdoors
style: 'mapbox://styles/mapbox/light-v11'       // Light
style: 'mapbox://styles/mapbox/dark-v11'        // Dark
style: 'mapbox://styles/mapbox/satellite-v9'     // Satellite
style: 'mapbox://styles/mapbox/satellite-streets-v12' // Satellite + Streets
```

## Current Setup

Hiện tại code đã được cấu hình để:
- Sử dụng Mapbox GL JS
- Có public token mặc định (có thể dùng để test)
- Tự động load CSS và JS từ CDN
- Hiển thị markers cho events
- Click vào marker để xem event details

## Lưu ý

- ⚠️ Public token có giới hạn, nên tạo token riêng cho production
- ⚠️ KHÔNG commit token vào Git
- ⚠️ Monitor usage trong Mapbox dashboard

## Nếu không muốn dùng Mapbox

Bạn có thể quay lại OpenStreetMap hoặc Google Maps bằng cách:
1. Thay đổi import trong các pages
2. Hoặc tôi có thể tạo component riêng cho từng loại map
