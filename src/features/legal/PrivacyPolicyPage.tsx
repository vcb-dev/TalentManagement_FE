import { LegalPageLayout } from './LegalPageLayout'

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Chính sách bảo mật" updatedAt="22/05/2026">
      <p>
        Chính sách này mô tả cách <strong>Công ty Viễn Chí Bảo</strong> (&quot;chúng tôi&quot;) thu
        thập, sử dụng và bảo vệ thông tin khi bạn sử dụng hệ thống{' '}
        <strong>Talent Management</strong> tại{' '}
        <a href="https://talent.vienchibao.com">talent.vienchibao.com</a>, bao gồm tích hợp với
        TikTok thông qua TikTok for Developers (Login Kit, Display API).
      </p>

      <h2>1. Phạm vi áp dụng</h2>
      <p>
        Chính sách áp dụng cho nhân viên, quản lý, talent/KOL và người dùng được cấp quyền truy cập
        hệ thống nội bộ của Viễn Chí Bảo, cũng như người dùng TikTok kết nối tài khoản với ứng dụng
        của chúng tôi.
      </p>

      <h2>2. Thông tin chúng tôi thu thập</h2>
      <h3>2.1. Tài khoản nội bộ (HRM)</h3>
      <ul>
        <li>Họ tên, email công ty, vai trò, phòng ban</li>
        <li>Dữ liệu đăng nhập và nhật ký hoạt động trong hệ thống</li>
        <li>Dữ liệu KPI, báo cáo, talent và các module nghiệp vụ liên quan</li>
      </ul>

      <h3>2.2. Khi bạn kết nối TikTok (OAuth)</h3>
      <p>
        Sau khi bạn đồng ý authorize qua TikTok Login Kit, chúng tôi có thể nhận từ TikTok (theo
        phạm vi quyền bạn cấp):
      </p>
      <ul>
        <li>Thông tin hồ sơ TikTok cơ bản (open_id, tên hiển thị, avatar nếu có)</li>
        <li>Danh sách video công khai/được authorize của tài khoản TikTok</li>
        <li>
          Số liệu thống kê video: lượt xem (<code>view_count</code>), lượt thích (
          <code>like_count</code>), bình luận, chia sẻ, thời gian đăng, mô tả/tiêu đề video
        </li>
        <li>Access token và refresh token (lưu trữ an toàn trên máy chủ để đồng bộ định kỳ)</li>
      </ul>
      <p>
        Chúng tôi <strong>không</strong> thu thập mật khẩu TikTok của bạn. Việc xác thực do TikTok
        thực hiện.
      </p>

      <h2>3. Mục đích sử dụng</h2>
      <ul>
        <li>Vận hành hệ thống quản lý nhân sự và talent nội bộ</li>
        <li>Đồng bộ và hiển thị hiệu suất nội dung TikTok (view, like, v.v.) phục vụ báo cáo</li>
        <li>Quản lý KPI, đánh giá chiến dịch và talent theo quy trình công ty</li>
        <li>Bảo mật tài khoản, phòng chống truy cập trái phép và gỡ lỗi kỹ thuật</li>
        <li>Tuân thủ yêu cầu pháp luật và chính sách nền tảng TikTok</li>
      </ul>

      <h2>4. Chia sẻ với bên thứ ba</h2>
      <p>Chúng tôi có thể chia sẻ dữ liệu với:</p>
      <ul>
        <li>
          <strong>TikTok / ByteDance</strong> — khi bạn sử dụng OAuth và API chính thức của TikTok
        </li>
        <li>
          <strong>Nhà cung cấp hạ tầng</strong> (hosting, cơ sở dữ liệu) trong phạm vi vận hành dịch
          vụ
        </li>
      </ul>
      <p>
        Chúng tôi <strong>không bán</strong> dữ liệu cá nhân cho bên thứ ba vì mục đích quảng cáo.
      </p>

      <h2>5. Lưu trữ và bảo mật</h2>
      <ul>
        <li>Dữ liệu lưu trên máy chủ do công ty/quản trị viên kiểm soát</li>
        <li>Token TikTok được lưu an toàn; truy cập API qua kênh mã hóa (HTTPS)</li>
        <li>Chỉ nhân sự được phân quyền mới truy cập dữ liệu nghiệp vụ liên quan</li>
      </ul>

      <h2>6. Thời gian lưu giữ</h2>
      <p>
        Dữ liệu được lưu trong thời gian cần thiết cho mục đích nghiệp vụ hoặc theo yêu cầu pháp
        luật. Khi ngắt kết nối TikTok hoặc chấm dứt tài khoản, token và dữ liệu đồng bộ liên quan có
        thể bị xóa hoặc ẩn danh hóa theo quy trình nội bộ.
      </p>

      <h2>7. Quyền của bạn</h2>
      <ul>
        <li>Rút lại quyền truy cập TikTok trong cài đặt TikTok hoặc liên hệ quản trị viên</li>
        <li>Yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân (trong phạm vi pháp luật)</li>
        <li>Khiếu nại về xử lý dữ liệu qua email liên hệ bên dưới</li>
      </ul>

      <h2>8. Trẻ em</h2>
      <p>
        Dịch vụ hướng tới người dùng nội bộ doanh nghiệp và talent được authorize; không hướng tới
        trẻ em dưới 13 tuổi.
      </p>

      <h2>9. Thay đổi chính sách</h2>
      <p>
        Chúng tôi có thể cập nhật chính sách này. Phiên bản mới sẽ được đăng tại URL này kèm ngày
        cập nhật.
      </p>

      <h2>10. Liên hệ</h2>
      <p>
        Mọi thắc mắc về bảo mật: <a href="mailto:dev@vienchibao.com">dev@vienchibao.com</a>
        <br />
        Công ty Viễn Chí Bảo · talent.vienchibao.com
      </p>
    </LegalPageLayout>
  )
}
