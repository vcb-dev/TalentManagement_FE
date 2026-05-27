import { LegalPageLayout } from './LegalPageLayout'

export function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Điều khoản sử dụng" updatedAt="22/05/2026">
      <p>
        Bằng việc truy cập và sử dụng hệ thống <strong>Talent Management</strong> của{' '}
        <strong>Công ty Viễn Chí Bảo</strong> tại{' '}
        <a href="https://talent.vienchibao.com">talent.vienchibao.com</a>, bạn đồng ý với các điều
        khoản dưới đây. Nếu không đồng ý, vui lòng không sử dụng dịch vụ.
      </p>

      <h2>1. Mô tả dịch vụ</h2>
      <p>
        Talent Management là nền tảng quản lý nhân sự và talent nội bộ, bao gồm (nhưng không giới
        hạn): KPI, đào tạo, báo cáo, quản lý talent/KOL và tích hợp API bên thứ ba (Facebook,
        TikTok, v.v.) để đồng bộ dữ liệu phục vụ vận hành doanh nghiệp.
      </p>

      <h2>2. Tài khoản và quyền truy cập</h2>
      <ul>
        <li>
          Tài khoản do công ty cấp hoặc duyệt; bạn chịu trách nhiệm bảo mật thông tin đăng nhập
        </li>
        <li>Không chia sẻ tài khoản cho người khác</li>
        <li>Công ty có thể thu hồi quyền truy cập khi chấm dứt hợp tác hoặc vi phạm quy định</li>
      </ul>

      <h2>3. Tích hợp TikTok</h2>
      <p>
        Khi kết nối tài khoản TikTok, bạn authorize ứng dụng truy cập dữ liệu theo phạm vi quyền
        hiển thị trên màn hình TikTok OAuth (ví dụ: thông tin cơ bản, danh sách video, số liệu
        view/like). Bạn cam kết:
      </p>
      <ul>
        <li>Chỉ kết nối tài khoản TikTok mà bạn có quyền quản lý hoặc được ủy quyền</li>
        <li>Tuân thủ Điều khoản dịch vụ và Chính sách của TikTok</li>
        <li>
          Không sử dụng dữ liệu đồng bộ cho mục đích trái pháp luật hoặc vi phạm quyền riêng tư
        </li>
      </ul>
      <p>
        Chúng tôi không chịu trách nhiệm cho thay đổi, gián đoạn hoặc hạn chế từ phía TikTok API.
      </p>

      <h2>4. Sử dụng chấp nhận được</h2>
      <p>Bạn không được:</p>
      <ul>
        <li>Truy cập trái phép, reverse engineer, scrape hoặc làm quá tải hệ thống</li>
        <li>Upload nội dung vi phạm pháp luật, bản quyền hoặc quy định công ty</li>
        <li>Lạm dụng token/API để thu thập dữ liệu ngoài phạm vi được cấp</li>
      </ul>

      <h2>5. Sở hữu trí tuệ</h2>
      <p>
        Phần mềm, giao diện, logo và nội dung hệ thống thuộc quyền sở hữu của Viễn Chí Bảo hoặc bên
        cấp phép. Dữ liệu nghiệp vụ do công ty và người dùng tạo ra thuộc quy định nội bộ công ty.
      </p>

      <h2>6. Từ chối bảo đảm</h2>
      <p>
        Dịch vụ được cung cấp &quot;nguyên trạng&quot; phục vụ vận hành nội bộ. Chúng tôi nỗ lực duy
        trì tính khả dụng và chính xác dữ liệu nhưng không bảo đảm dịch vụ không gián đoạn hoặc
        không có lỗi.
      </p>

      <h2>7. Giới hạn trách nhiệm</h2>
      <p>
        Trong phạm vi pháp luật cho phép, Viễn Chí Bảo không chịu trách nhiệm cho thiệt hại gián
        tiếp phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ, bao gồm mất dữ liệu do sự cố
        bên thứ ba (TikTok, nhà mạng, hosting).
      </p>

      <h2>8. Chấm dứt</h2>
      <p>
        Công ty có thể tạm ngưng hoặc chấm dứt quyền truy cập nếu vi phạm điều khoản. Bạn có thể yêu
        cầu ngắt kết nối TikTok và đóng tài khoản theo quy trình nội bộ.
      </p>

      <h2>9. Thay đổi điều khoản</h2>
      <p>
        Chúng tôi có thể sửa đổi điều khoản; phiên bản mới có hiệu lực khi đăng tại URL này. Việc
        tiếp tục sử dụng dịch vụ đồng nghĩa chấp nhận thay đổi.
      </p>

      <h2>10. Luật áp dụng và liên hệ</h2>
      <p>
        Điều khoản được giải thích theo pháp luật Việt Nam. Liên hệ:{' '}
        <a href="mailto:dev@vienchibao.com">dev@vienchibao.com</a>
      </p>
    </LegalPageLayout>
  )
}
