import { forwardRef, useEffect, useImperativeHandle, useRef, type ReactNode } from 'react'
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  type Control,
  type FieldArrayPath,
  type FieldPath,
} from 'react-hook-form'
import { ChevronDown, Plus } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_COMPANY_LANDING_CONTENT } from '@/features/landing/landingContent.defaults'
import { LANDING_ICON_NAMES } from '@/features/landing/landingContent.icons'
import { LandingImageField } from '@/features/landing/LandingImageField'
import type {
  CompanyLandingContent,
  LandingIconName,
} from '@/features/landing/landingContent.types'
import { cn } from '@/lib/utils'

export type CompanyLandingSettingsFormHandle = {
  submit: () => void
  restoreDefault: () => void
}

type Props = {
  merged: CompanyLandingContent
  onValidSubmit: (data: CompanyLandingContent) => void
  /** Tăng sau khi lưu thành công + refetch — reset form khỏi trạng thái dirty. */
  saveTick?: number
  /** `true` khi query GET public đã hoàn tất ít nhất một lần — dùng để hydrate form đúng một lần. */
  landingFetched: boolean
}

function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>
}

function FormBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <Label className="text-foreground">{label}</Label>
      {children}
    </div>
  )
}

function IconSelect({
  control,
  name,
  label,
}: {
  control: Control<CompanyLandingContent>
  name: FieldPath<CompanyLandingContent>
  label: string
}) {
  return (
    <FormBlock label={label}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value as string}
            onValueChange={(v) => field.onChange(v as LandingIconName)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn icon" />
            </SelectTrigger>
            <SelectContent>
              {LANDING_ICON_NAMES.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FormBlock>
  )
}

function LinesToStringArrayField({
  control,
  name,
  label,
  rows = 4,
  hint,
}: {
  control: Control<CompanyLandingContent>
  name: FieldPath<CompanyLandingContent>
  label: string
  rows?: number
  hint?: string
}) {
  return (
    <FormBlock label={label}>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Textarea
            className="min-h-[88px] font-normal"
            rows={rows}
            spellCheck
            value={(field.value as string[] | undefined)?.join('\n') ?? ''}
            onChange={(e) => {
              const lines = e.target.value
                .split('\n')
                .map((l) => l.trimEnd())
                .filter((l) => l.length > 0)
              field.onChange(lines)
            }}
          />
        )}
      />
    </FormBlock>
  )
}

export const CompanyLandingSettingsForm = forwardRef<CompanyLandingSettingsFormHandle, Props>(
  function CompanyLandingSettingsForm(
    { merged, onValidSubmit, saveTick = 0, landingFetched },
    ref
  ) {
    const methods = useForm<CompanyLandingContent>({
      defaultValues: merged,
    })
    const { control, register, handleSubmit, reset } = methods
    const lastSaveTickRef = useRef(0)
    const didInitialHydrateRef = useRef(false)

    useEffect(() => {
      if (saveTick > lastSaveTickRef.current) {
        lastSaveTickRef.current = saveTick
        reset(merged)
        return
      }
      if (landingFetched && !didInitialHydrateRef.current) {
        didInitialHydrateRef.current = true
        reset(merged)
      }
    }, [merged, reset, saveTick, landingFetched])

    useImperativeHandle(
      ref,
      () => ({
        submit: () => {
          void handleSubmit(onValidSubmit)()
        },
        restoreDefault: () => {
          reset(DEFAULT_COMPANY_LANDING_CONTENT)
        },
      }),
      [handleSubmit, onValidSubmit, reset]
    )

    const introParas = useFieldArray({
      control,
      name: 'introduction.paragraphs' as unknown as FieldArrayPath<CompanyLandingContent>,
    })
    const ecoItems = useFieldArray({ control, name: 'ecosystem.items' })
    const pillars = useFieldArray({ control, name: 'strategy.pillars' })
    const leaders = useFieldArray({ control, name: 'leadership.leaders' })
    const brandPillars = useFieldArray({ control, name: 'overview.brandPillars' })
    const overviewStats = useFieldArray({ control, name: 'overview.stats' })

    return (
      <FormProvider {...methods}>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onValidSubmit)}>
          <Accordion
            type="multiple"
            className="space-y-3"
            defaultValue={['nav', 'hero', 'vision', 'ecosystem']}
          >
            <AccordionItem
              value="nav"
              className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm data-[state=open]:border-primary/35"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <ChevronDown className="chevron-accordion h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                <span className="text-base font-semibold">Thanh điều hướng</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <FieldGrid>
                  <FormBlock label="Tên thương hiệu (logo)">
                    <Input {...register('header.brandName')} />
                  </FormBlock>
                  <FormBlock label="Mục: Tầm nhìn & Sứ mệnh">
                    <Input {...register('header.navVisionMission')} />
                  </FormBlock>
                  <FormBlock label="Mục: Hệ sinh thái">
                    <Input {...register('header.navEcosystem')} />
                  </FormBlock>
                  <FormBlock label="Mục: Giới thiệu">
                    <Input {...register('header.navIntroduction')} />
                  </FormBlock>
                  <FormBlock label="Mục: Định vị">
                    <Input {...register('header.navStrategy')} />
                  </FormBlock>
                  <FormBlock label="Mục: Ban điều hành">
                    <Input {...register('header.navLeadership')} />
                  </FormBlock>
                </FieldGrid>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="hero"
              className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm data-[state=open]:border-primary/35"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <ChevronDown className="chevron-accordion h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                <span className="text-base font-semibold">Khu vực Hero</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <FieldGrid>
                  <FormBlock label="Dòng badge phía trên tiêu đề">
                    <Input {...register('hero.badge')} />
                  </FormBlock>
                  <FormBlock label="Tiêu đề — phần 1 (trước highlight)">
                    <Input {...register('hero.titleLine1Before')} />
                  </FormBlock>
                  <FormBlock label="Tiêu đề — phần 1 (highlight)">
                    <Input {...register('hero.titleLine1Highlight')} />
                  </FormBlock>
                  <FormBlock label="Tiêu đề — phần 2 (trước highlight)">
                    <Input {...register('hero.titleLine2Before')} />
                  </FormBlock>
                  <FormBlock label="Tiêu đề — phần 2 (highlight)">
                    <Input {...register('hero.titleLine2Highlight')} />
                  </FormBlock>
                  <FormBlock label="Mô tả ngắn (subtitle)">
                    <Textarea className="min-h-[100px]" {...register('hero.subtitle')} />
                  </FormBlock>
                  <FormBlock label="Nút kêu gọi (CTA)">
                    <Input {...register('hero.exploreCta')} />
                  </FormBlock>
                  <LandingImageField
                    control={control}
                    name="hero.teamImageSrc"
                    label="Ảnh đội ngũ (hero)"
                    hint="Ảnh tải lên lưu trên máy chủ; hoặc giữ đường dẫn tĩnh /Image_VCB/..."
                    previewClassName="aspect-[4/3] max-h-72"
                  />
                  <FormBlock label="Mô tả ảnh đội ngũ (alt)">
                    <Input {...register('hero.teamImageAlt')} />
                  </FormBlock>
                </FieldGrid>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="vision"
              className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm data-[state=open]:border-primary/35"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <ChevronDown className="chevron-accordion h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                <span className="text-base font-semibold">Tầm nhìn & Sứ mệnh</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-6">
                <p className="text-sm font-medium text-foreground/90">Khối giới thiệu mục</p>
                <FieldGrid>
                  <FormBlock label="Dòng phụ (kicker)">
                    <Input {...register('visionMissionSection.kicker')} />
                  </FormBlock>
                  <IconSelect
                    control={control}
                    name="visionMissionSection.kickerIcon"
                    label="Icon kicker"
                  />
                  <FormBlock label="Tiêu đề mục">
                    <Input {...register('visionMissionSection.title')} />
                  </FormBlock>
                  <FormBlock label="Mô tả mục">
                    <Textarea {...register('visionMissionSection.subtitle')} />
                  </FormBlock>
                </FieldGrid>

                <p className="text-sm font-medium text-foreground/90">Tầm nhìn</p>
                <FieldGrid>
                  <IconSelect control={control} name="vision.icon" label="Icon tầm nhìn" />
                  <FormBlock label="Tiêu đề">
                    <Input {...register('vision.title')} />
                  </FormBlock>
                  <FormBlock label="Đoạn dẫn chính">
                    <Textarea {...register('vision.lead')} />
                  </FormBlock>
                  <FormBlock label="Tiêu đề danh sách (ví dụ: Trong 5 năm tới:)">
                    <Input {...register('vision.subHeading')} />
                  </FormBlock>
                </FieldGrid>
                <LinesToStringArrayField
                  control={control}
                  name="vision.points"
                  label="Các ý tầm nhìn (mỗi dòng một ý)"
                  rows={5}
                />

                <p className="text-sm font-medium text-foreground/90">Sứ mệnh</p>
                <FieldGrid>
                  <IconSelect control={control} name="mission.icon" label="Icon sứ mệnh" />
                  <FormBlock label="Tiêu đề">
                    <Input {...register('mission.title')} />
                  </FormBlock>
                </FieldGrid>
                <LinesToStringArrayField
                  control={control}
                  name="mission.points"
                  label="Các ý sứ mệnh (mỗi dòng một ý)"
                  rows={5}
                />
                <FormBlock label="Đoạn kết sứ mệnh">
                  <Textarea {...register('mission.closing')} />
                </FormBlock>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="ecosystem"
              className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm data-[state=open]:border-primary/35"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <ChevronDown className="chevron-accordion h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                <span className="text-base font-semibold">Hệ sinh thái</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <FormBlock label="Tiêu đề mục">
                  <Input {...register('ecosystem.sectionTitle')} />
                </FormBlock>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-foreground">Ba mục hệ sinh thái</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => ecoItems.append({ label: '', desc: '' })}
                    >
                      <Plus className="mr-1 size-4" />
                      Thêm mục
                    </Button>
                  </div>
                  {ecoItems.fields.map((field, i) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Mục {i + 1}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => ecoItems.remove(i)}
                        >
                          Xóa
                        </Button>
                      </div>
                      <FormBlock label="Nhãn (in hoa)">
                        <Input {...register(`ecosystem.items.${i}.label` as const)} />
                      </FormBlock>
                      <FormBlock label="Mô tả">
                        <Textarea {...register(`ecosystem.items.${i}.desc` as const)} />
                      </FormBlock>
                    </div>
                  ))}
                </div>
                <FieldGrid>
                  <LandingImageField
                    control={control}
                    name="ecosystem.artisanBanner.precision"
                    label="Ảnh banner — độ chính xảo / kim hoàn"
                    previewClassName="aspect-[3/4] max-h-64 max-w-[200px]"
                  />
                  <LandingImageField
                    control={control}
                    name="ecosystem.artisanBanner.leather"
                    label="Ảnh banner — đồ da"
                    previewClassName="aspect-[3/4] max-h-64 max-w-[200px]"
                  />
                  <FormBlock label="Mô tả ảnh (precision)">
                    <Input {...register('ecosystem.artisanAltPrecision')} />
                  </FormBlock>
                  <FormBlock label="Mô tả ảnh (leather)">
                    <Input {...register('ecosystem.artisanAltLeather')} />
                  </FormBlock>
                </FieldGrid>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="intro"
              className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm data-[state=open]:border-primary/35"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <ChevronDown className="chevron-accordion h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                <span className="text-base font-semibold">Giới thiệu công ty</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <FormBlock label="Tiêu đề mục">
                  <Input {...register('introduction.sectionTitle')} />
                </FormBlock>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-foreground">Các đoạn văn</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => introParas.append('' as never)}
                  >
                    <Plus className="mr-1 size-4" />
                    Thêm đoạn
                  </Button>
                </div>
                {introParas.fields.map((field, i) => (
                  <div key={field.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Đoạn {i + 1}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => introParas.remove(i)}
                      >
                        Xóa đoạn
                      </Button>
                    </div>
                    <Textarea rows={4} {...register(`introduction.paragraphs.${i}` as const)} />
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="strategy"
              className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm data-[state=open]:border-primary/35"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <ChevronDown className="chevron-accordion h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                <span className="text-base font-semibold">Định vị chiến lược</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <FormBlock label="Tiêu đề mục">
                  <Input {...register('strategy.sectionTitle')} />
                </FormBlock>
                <FormBlock label="Trích dẫn / banner">
                  <Textarea {...register('strategy.bannerQuote')} />
                </FormBlock>
                <FieldGrid>
                  <LandingImageField
                    control={control}
                    name="strategy.traditionalImageSrc"
                    label="Ảnh thủ công truyền thống — tệp hoặc đường dẫn"
                    previewClassName="aspect-[3/4] max-h-72 max-w-[260px]"
                  />
                  <FormBlock label="Mô tả ảnh (alt)">
                    <Input {...register('strategy.traditionalImageAlt')} />
                  </FormBlock>
                </FieldGrid>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-foreground">Trụ cột chiến lược</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => pillars.append({ label: '', desc: '' })}
                    >
                      <Plus className="mr-1 size-4" />
                      Thêm trụ cột
                    </Button>
                  </div>
                  {pillars.fields.map((field, i) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Trụ cột {i + 1}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => pillars.remove(i)}
                        >
                          Xóa
                        </Button>
                      </div>
                      <FormBlock label="Nhãn">
                        <Input {...register(`strategy.pillars.${i}.label` as const)} />
                      </FormBlock>
                      <FormBlock label="Mô tả">
                        <Textarea {...register(`strategy.pillars.${i}.desc` as const)} />
                      </FormBlock>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="leadership"
              className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm data-[state=open]:border-primary/35"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <ChevronDown className="chevron-accordion h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                <span className="text-base font-semibold">Ban điều hành</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <FieldGrid>
                  <FormBlock label="Badge (dòng phụ)">
                    <Input {...register('leadership.badge')} />
                  </FormBlock>
                  <IconSelect control={control} name="leadership.badgeIcon" label="Icon badge" />
                </FieldGrid>
                <FormBlock label="Tiêu đề mục">
                  <Input {...register('leadership.sectionTitle')} />
                </FormBlock>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-foreground">Thành viên</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        leaders.append({
                          name: '',
                          role: '',
                          photo: '',
                          bullets: [''],
                        })
                      }
                    >
                      <Plus className="mr-1 size-4" />
                      Thêm thành viên
                    </Button>
                  </div>
                  {leaders.fields.map((field, i) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Thành viên {i + 1}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => leaders.remove(i)}
                        >
                          Xóa
                        </Button>
                      </div>
                      <FieldGrid>
                        <FormBlock label="Họ tên">
                          <Input {...register(`leadership.leaders.${i}.name` as const)} />
                        </FormBlock>
                        <FormBlock label="Chức danh">
                          <Input {...register(`leadership.leaders.${i}.role` as const)} />
                        </FormBlock>
                        <LandingImageField
                          control={control}
                          name={`leadership.leaders.${i}.photo` as FieldPath<CompanyLandingContent>}
                          label="Ảnh chân dung"
                          previewClassName="aspect-square size-36 max-h-36 max-w-36"
                        />
                      </FieldGrid>
                      <LinesToStringArrayField
                        control={control}
                        name={`leadership.leaders.${i}.bullets` as FieldPath<CompanyLandingContent>}
                        label="Gạch đầu dòng (mỗi dòng một ý)"
                        rows={4}
                        hint="Mỗi dòng hiển thị một bullet trên trang công khai."
                      />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="overview"
              className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm data-[state=open]:border-primary/35"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <ChevronDown className="chevron-accordion h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                <span className="text-base font-semibold">Tổng quan công ty</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <FieldGrid>
                  <LandingImageField
                    control={control}
                    name="overview.socialBannerSrc"
                    label="Ảnh banner mạng xã hội / collage"
                    previewClassName="aspect-video max-h-52 max-w-xl"
                  />
                  <FormBlock label="Mô tả ảnh (alt)">
                    <Input {...register('overview.socialBannerAlt')} />
                  </FormBlock>
                  <FormBlock label="Số liệu video (giá trị lớn)">
                    <Input {...register('overview.videoStatValue')} />
                  </FormBlock>
                  <FormBlock label="Dòng thống kê 1">
                    <Input {...register('overview.videoStatLine1')} />
                  </FormBlock>
                  <FormBlock label="Dòng thống kê 2">
                    <Input {...register('overview.videoStatLine2')} />
                  </FormBlock>
                  <FormBlock label="Kicker mục">
                    <Input {...register('overview.sectionKicker')} />
                  </FormBlock>
                  <FormBlock label="Tiêu đề mục">
                    <Input {...register('overview.sectionTitle')} />
                  </FormBlock>
                </FieldGrid>
                <FormBlock label="Đoạn mở đầu">
                  <Textarea {...register('overview.leadParagraph')} />
                </FormBlock>
                <FormBlock label="Giới thiệu thương hiệu (đoạn dẫn)">
                  <Textarea {...register('overview.brandIntro')} />
                </FormBlock>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-foreground">Ba trụ thương hiệu</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        brandPillars.append({ icon: 'Target' as LandingIconName, text: '' })
                      }
                    >
                      <Plus className="mr-1 size-4" />
                      Thêm trụ
                    </Button>
                  </div>
                  {brandPillars.fields.map((field, i) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Trụ {i + 1}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => brandPillars.remove(i)}
                        >
                          Xóa
                        </Button>
                      </div>
                      <IconSelect
                        control={control}
                        name={`overview.brandPillars.${i}.icon` as FieldPath<CompanyLandingContent>}
                        label="Icon"
                      />
                      <FormBlock label="Nội dung">
                        <Textarea {...register(`overview.brandPillars.${i}.text` as const)} />
                      </FormBlock>
                    </div>
                  ))}
                </div>
                <FormBlock label="Đoạn kết">
                  <Textarea {...register('overview.closingParagraph')} />
                </FormBlock>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-foreground">Thống kê (số liệu nổi bật)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        overviewStats.append({
                          icon: 'TrendingUp' as LandingIconName,
                          label: '',
                          desc: '',
                        })
                      }
                    >
                      <Plus className="mr-1 size-4" />
                      Thêm chỉ số
                    </Button>
                  </div>
                  {overviewStats.fields.map((field, i) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Chỉ số {i + 1}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => overviewStats.remove(i)}
                        >
                          Xóa
                        </Button>
                      </div>
                      <FieldGrid>
                        <IconSelect
                          control={control}
                          name={`overview.stats.${i}.icon` as FieldPath<CompanyLandingContent>}
                          label="Icon"
                        />
                        <FormBlock label="Giá trị (số/chữ)">
                          <Input {...register(`overview.stats.${i}.label` as const)} />
                        </FormBlock>
                        <FormBlock label="Mô tả ngắn">
                          <Input {...register(`overview.stats.${i}.desc` as const)} />
                        </FormBlock>
                      </FieldGrid>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="cta"
              className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm data-[state=open]:border-primary/35"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <ChevronDown className="chevron-accordion h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                <span className="text-base font-semibold">Lời kêu gọi & chân trang</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <FieldGrid>
                  <FormBlock label="Tiêu đề CTA">
                    <Input {...register('cta.title')} />
                  </FormBlock>
                  <FormBlock label="Nút phụ">
                    <Input {...register('cta.secondaryButton')} />
                  </FormBlock>
                </FieldGrid>
                <FormBlock label="Nội dung CTA">
                  <Textarea {...register('cta.body')} />
                </FormBlock>
                <FieldGrid>
                  <FormBlock label="Copyright (phần sau năm)">
                    <Input {...register('footer.copyrightRest')} />
                  </FormBlock>
                  <FormBlock label="Liên kết: Giới thiệu (nhãn)">
                    <Input {...register('footer.linkIntro')} />
                  </FormBlock>
                  <FormBlock label="Liên kết: Ban điều hành (nhãn)">
                    <Input {...register('footer.linkLeadership')} />
                  </FormBlock>
                  <FormBlock label="Tiền tố liên kết Trang chủ">
                    <Input {...register('footer.linkHomePrefix')} />
                  </FormBlock>
                </FieldGrid>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </form>
      </FormProvider>
    )
  }
)
