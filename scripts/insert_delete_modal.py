#!/usr/bin/env python3
path = '/Users/macbook/TalentManagement/TalentManagement_FE/src/features/room-booking/RoomBookingPage.tsx'
content = open(path).read()
ot, ct = chr(60), chr(62)
d = 'motion-safe:animate-spin" />'
d = 'div'

def tag(cls, extra=''):
    return f'{ot}{d} className="{cls}"{extra}{ct}'

def end():
    return f'{ot}/{d}{ct}'

block = f"""
      {{deleteConfirmId && (
        {tag('fixed inset-0 z-[110] flex items-center justify-center p-4')}
          onClick={{() => setDeleteConfirmId(null)}}
        >
          {tag('absolute inset-0 bg-black/40 backdrop-blur-md')}
          {tag('relative w-full max-w-md bg-card p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-200', ' onClick={{(e) => e.stopPropagation()}}')}
            {tag('flex flex-col items-center text-center space-y-6')}
              {tag('w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center')}
                <AlertCircle className="h-10 w-10 text-rose-500" />
              {end()}
              {tag('', '')}
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Hủy lịch họp</h3>
                <p className="text-muted-foreground text-sm leading-relaxed px-4">
                  Bạn có chắc chắn muốn hủy lịch họp này không? Hành động này không thể khôi phục.
                </p>
              {end()}
              {tag('flex w-full gap-4 pt-4')}
                <button
                  onClick={{() => setDeleteConfirmId(null)}}
                  className="flex-1 py-4 font-bold text-muted-foreground uppercase hover:bg-muted/50 rounded-2xl transition-all"
                >
                  Quay lại
                </button>
                <button
                  onClick={{executeDelete}}
                  className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl uppercase shadow-lg shadow-rose-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  XÁC NHẬN HỦY
                </button>
              {end()}
            {end()}
          {end()}
        {end()}
      )}}
"""

# fix empty class tag
block = block.replace(f'{ot}{d} className=""{ct}', f'{ot}{d}{ct}')
block = block.replace(f'{ot}{d} className=""{ct}', f'{ot}{d}{ct}')

needle = '      )}\n    </div>\n  )\n}'
if needle not in content:
    raise SystemExit('needle not found')
content = content.replace(needle, '      )}' + block + '\n    </div>\n  )\n}')
open(path, 'w').write(content)
print('inserted')
