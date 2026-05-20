#!/usr/bin/env python3
path = '/Users/macbook/TalentManagement/TalentManagement_FE/src/features/room-booking/RoomBookingPage.tsx'
with open(path) as f:
    content = f.read()

i0 = content.index('        {/* Bảng lịch họp */}')
i1 = content.index('      {/* Form Đặt phòng */}')

ot, ct = chr(60), chr(62)
dv = 'div'

def o(cls):
    return f'{ot}{dv} className="{cls}"{ct}'

def c():
    return f'{ot}/{dv}{ct}'

L = []
a = L.append
a(f'        {o("grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]")}')
a(f'          {o("space-y-4")}')
a(f'            {o("grid grid-cols-2 gap-3 sm:grid-cols-4")}')
for val, color, label in [
    ('{stats.total}', 'text-primary', 'Tổng phòng'),
    ('{stats.ongoing}', 'text-indigo-600', 'Đang họp'),
    ('{stats.pending}', 'text-amber-600', 'Chờ duyệt'),
    ('{stats.available}', 'text-emerald-600', 'Còn trống'),
]:
    a(f'              {o("rounded-2xl border border-border/60 bg-card px-4 py-3 text-center")}')
    a(f'                <p className="text-2xl font-bold {color}">{val}</p>')
    a(f'                <p className="text-xs text-muted-foreground">{label}</p>')
    a(f'              {c()}')
a(f'            {c()}')
a(f'            {o("rounded-2xl border border-border/60 bg-card p-4 space-y-4")}')
a(f'              {o("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between")}')
a(f'                {o("flex flex-wrap items-center gap-2")}')
a('''                <button type="button" onClick={() => setViewDate(addDaysIso(viewDate, -1))} className="rounded-lg border border-border p-2 hover:bg-muted" aria-label="Ngày trước"><ChevronLeft className="h-4 w-4" /></button>''')
a(f'                {o("flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2")}')
a('                  <Calendar className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">{dateLabel}</span>')
a(f'                {c()}')
a('''                <button type="button" onClick={() => setViewDate(addDaysIso(viewDate, 1))} className="rounded-lg border border-border p-2 hover:bg-muted" aria-label="Ngày sau"><ChevronRight className="h-4 w-4" /></button>''')
a('''                {!isTodayView && (<button type="button" onClick={() => setViewDate(vnTime.date)} className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5">Hôm nay</button>)}''')
a(f'              {c()}')
a(f'              {o("flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between")}')
a(f'                {o("flex flex-col gap-2 sm:flex-row sm:items-center")}')
a('''                <CustomSelect value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} options={STATUS_FILTER_OPTIONS.map((o) => ({ label: o.label, value: o.value }))} />''')
a(f'                {o("flex flex-wrap items-center gap-3 text-xs text-muted-foreground")}')
a('''                  {LEGEND_ITEMS.map((item) => (<span key={item.key} className="inline-flex items-center gap-1.5"><span className={"h-2.5 w-2.5 rounded-full " + item.className} />{item.label}</span>))}''')
a(f'                {c()}')
a(f'              {c()}')
a('''                <button type="button" onClick={() => { resetForm(); setDate(viewDate); setShowModal(true) }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90"><Plus className="h-4 w-4" />Đặt phòng</button>''')
a(f'            {c()}')
a('''            {isFetching && bookings.length === 0 ? (<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></motion-safe:animate-spin" />) : (<RoomScheduleTimeline viewDate={viewDate} bookings={dayBookings} vnTime={vnTime} onEmptySlotClick={openEmptySlot} onBookingClick={handleEdit} />)}''')
# fix last line corruption
L[-1] = L[-1].replace('<motion-safe:animate-spin" />', c()).replace('(<motion-safe', '(<' + dv).replace('className="flex', 'className="flex')
# manual fix loading div
L[-1] = '''            {isFetching && bookings.length === 0 ? (
              ''' + o('flex justify-center py-16') + '''
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ''' + c() + '''
            ) : (
              <RoomScheduleTimeline
                viewDate={viewDate}
                bookings={dayBookings}
                vnTime={vnTime}
                onEmptySlotClick={openEmptySlot}
                onBookingClick={handleEdit}
              />
            )}'''
a(f'          {c()}')
a(f'          <aside className="space-y-4">')
a('''            {isPrivileged && (<RoomBookingPendingPanel items={pendingRequests} processingId={processingId} onApprove={handleApprove} onReject={setRejectId} />)}
            <RoomBookingRecentPanel items={recentItems} />''')
a(f'          </aside>')
a(f'        {c()}')
a('')

replacement = '\n'.join(L) + '\n'
open(path, 'w').write(content[:i0] + replacement + content[i1:])
print('ok')
