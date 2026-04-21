import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Edit, Trash2, Plus, X, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useManagerRoadmapItems,
  useCreateManagerRoadmapItem,
  useUpdateManagerRoadmapItem,
  useDeleteManagerRoadmapItem,
} from '@/features/manager/hooks'

const formSchema = z.object({
  id: z.string().optional(),
  levelLabel: z.string().min(1, 'Bắt buộc'),
  topic: z.string().min(1, 'Bắt buộc'),
  objective: z.string().min(1, 'Bắt buộc'),
  materialRef: z.string().nullable().optional(),
  trainer: z.string().nullable().optional(),
  assessment: z.string().nullable().optional(),
  rowOrder: z.coerce.number().optional(),
})
type FormValues = z.infer<typeof formSchema>

export function RoadmapCrud() {
  const { data: items, isLoading } = useManagerRoadmapItems()
  const createItem = useCreateManagerRoadmapItem()
  const updateItem = useUpdateManagerRoadmapItem()
  const deleteItem = useDeleteManagerRoadmapItem()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [filterLevel, setFilterLevel] = useState<string>('all')

  const uniqueLevels = Array.from(new Set(items?.map((i) => i.levelLabel).filter(Boolean)))

  // Sort items by rowOrder before processing spans
  const sortedItems = items ? [...items].sort((a, b) => (a.rowOrder || 0) - (b.rowOrder || 0)) : []
  const filteredItems = sortedItems?.filter(
    (item) => filterLevel === 'all' || item.levelLabel === filterLevel
  )

  const levelSpans: Record<number, number> = {}
  const topicSpans: Record<number, number> = {}

  if (filteredItems) {
    // Calculate rowSpan for levelLabel
    let i = 0
    while (i < filteredItems.length) {
      let span = 1
      while (
        i + span < filteredItems.length &&
        filteredItems[i + span]?.levelLabel === filteredItems[i]?.levelLabel
      ) {
        span++
      }
      levelSpans[i] = span
      i += span
    }

    // Calculate rowSpan for topic
    i = 0
    while (i < filteredItems.length) {
      let span = 1
      while (
        i + span < filteredItems.length &&
        filteredItems[i + span]?.topic === filteredItems[i]?.topic &&
        filteredItems[i + span]?.levelLabel === filteredItems[i]?.levelLabel
      ) {
        span++
      }
      topicSpans[i] = span
      i += span
    }
  }

  function parseAndRenderMaterial(materialRef: string | null) {
    if (!materialRef) return <span className="text-gray-400 italic">Trống</span>
    if (materialRef.includes('http')) {
      const parts = materialRef.split(/(https?:\/\/[^\s]+)/)
      return (
        <span className="space-x-1">
          {parts.map((part, i) => {
            if (part.startsWith('http')) {
              return (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary-600 transition-colors hover:text-primary-800 hover:underline"
                >
                  <span className="underline-offset-4 break-all">{part}</span>
                  <ExternalLink className="mb-[2px] h-3 w-3 flex-shrink-0" />
                </a>
              )
            }
            return (
              <span key={i} className="text-gray-800">
                {part}
              </span>
            )
          })}
        </span>
      )
    }
    return <span className="font-medium text-gray-800">{materialRef}</span>
  }

  const defaultValues: FormValues = {
    levelLabel: '',
    topic: '',
    objective: '',
    materialRef: '',
    trainer: '',
    assessment: '',
    rowOrder: 1,
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  function onSubmit(data: FormValues) {
    if (editingId) {
      updateItem.mutate(
        {
          id: editingId,
          input: data,
        },
        {
          onSuccess: () => {
            form.reset()
            setEditingId(null)
            setIsFormVisible(false)
          },
        }
      )
    } else {
      createItem.mutate(data, {
        onSuccess: () => {
          form.reset()
          setIsFormVisible(false)
        },
      })
    }
  }

  const handleEdit = (item: any) => {
    setEditingId(item.id)
    form.reset({
      levelLabel: item.levelLabel,
      topic: item.topic,
      objective: item.objective,
      materialRef: item.materialRef || '',
      trainer: item.trainer || '',
      assessment: item.assessment || '',
      rowOrder: item.rowOrder || 1,
    })
    setIsFormVisible(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa mục này?')) {
      deleteItem.mutate(id)
    }
  }

  const handleCancel = () => {
    form.reset(defaultValues)
    setEditingId(null)
    setIsFormVisible(false)
  }

  return (
    <>
      <PageHeader
        title="Quản lý lộ trình học (CRUD)"
        description="Thêm, sửa, xoá các đầu mục lộ trình tự động hóa cho nhân sự"
      />

      <div className="space-y-6">
        {!isLoading && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-sm font-medium text-gray-700 min-w-[70px]">Lọc cấp độ:</span>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-[200px] md:w-[280px]">
                  <SelectValue placeholder="Tất cả cấp độ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả cấp độ</SelectItem>
                  {uniqueLevels.map((lvl) => (
                    <SelectItem key={lvl} value={lvl as string}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setIsFormVisible(true)}
              className="w-full sm:w-auto mt-2 sm:mt-0 shadow-md transition-transform hover:scale-[1.02]"
            >
              <Plus className="mr-2 h-4 w-4" /> Thêm đầu mục mới
            </Button>
          </div>
        )}

        <Dialog
          open={isFormVisible}
          onOpenChange={(open) => {
            if (!open) handleCancel()
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Chỉnh sửa lộ trình' : 'Thêm mới lộ trình'}</DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="levelLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cấp/Nhãn lộ trình</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ví dụ: Tập sự -> Biết việc"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chủ đề</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ví dụ: Tư duy, Kĩ năng..."
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="objective"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Mục tiêu (Objective)</FormLabel>
                          <FormControl>
                            <Textarea
                              className="min-h-[80px]"
                              placeholder="Chi tiết mục tiêu..."
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="materialRef"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Tài liệu (Reference links)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Link Google Drive, Video..."
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="trainer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Người đào tạo</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ví dụ: Anh Huy, Tự học"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assessment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Đánh giá (Assessment)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ví dụ: Review, Thi trắc nghiệm"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rowOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thứ tự hiển thị (Order)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Hủy
                    </Button>
                    <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
                      {createItem.isPending || updateItem.isPending
                        ? 'Đang lưu...'
                        : editingId
                          ? 'Cập nhật'
                          : 'Thêm mới'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardContent className="p-0">
            <Table className="border-collapse border border-gray-200">
              <TableHeader className="bg-primary/20">
                <TableRow className="border-b-2 border-gray-300">
                  <TableHead className="font-bold text-gray-900 border border-gray-200 w-[150px] align-middle">
                    Cấp / Nhãn
                  </TableHead>
                  <TableHead className="font-bold text-gray-900 border border-gray-200 w-[250px] align-middle">
                    Chủ đề
                  </TableHead>
                  <TableHead className="font-bold text-gray-900 border border-gray-200 align-middle">
                    Mục tiêu chi tiết
                  </TableHead>
                  <TableHead className="font-bold text-gray-900 border border-gray-200 align-middle">
                    Tài liệu
                  </TableHead>
                  <TableHead className="font-bold text-gray-900 border border-gray-200 align-middle">
                    Người đào tạo
                  </TableHead>
                  <TableHead className="font-bold text-gray-900 border border-gray-200 align-middle">
                    Đánh giá
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap font-bold text-gray-900 border border-gray-200 align-middle pr-4">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredItems?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Chưa có dữ liệu phù hợp
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems?.map((item, index) => {
                    const rowSpanLevel = levelSpans[index]
                    const rowSpanTopic = topicSpans[index]

                    return (
                      <TableRow
                        key={item.id}
                        className="border-b border-gray-200 hover:bg-transparent"
                      >
                        {rowSpanLevel !== undefined && (
                          <TableCell
                            rowSpan={rowSpanLevel}
                            className="font-bold text-gray-900 bg-yellow-200/50 border border-gray-300 align-middle text-center whitespace-break-spaces shadow-[inset_-1px_0_0_rgba(0,0,0,0.1)]"
                          >
                            {item.levelLabel}
                          </TableCell>
                        )}

                        {rowSpanTopic !== undefined && (
                          <TableCell
                            rowSpan={rowSpanTopic}
                            className="bg-green-100/40 font-medium text-gray-800 align-middle whitespace-pre-line border border-gray-300 shadow-[inset_-1px_0_0_rgba(0,0,0,0.05)]"
                          >
                            {item.topic}
                          </TableCell>
                        )}

                        <TableCell
                          className="max-w-[300px] align-middle border border-gray-200 bg-orange-50/20"
                          title={item.objective}
                        >
                          {item.objective}
                        </TableCell>

                        <TableCell className="align-middle border border-gray-200 bg-orange-50/20">
                          {parseAndRenderMaterial(item.materialRef)}
                        </TableCell>

                        <TableCell className="align-middle border border-gray-200 bg-orange-50/20 whitespace-pre-line text-sm text-gray-700">
                          {item.trainer || '-'}
                        </TableCell>

                        <TableCell className="align-middle border border-gray-200 bg-orange-50/20 whitespace-pre-line text-sm text-gray-700">
                          {item.assessment || '-'}
                        </TableCell>

                        <TableCell className="text-right align-middle border border-gray-200 bg-orange-50/20">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
