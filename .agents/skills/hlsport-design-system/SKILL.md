---
name: hlsport-design-system
description: >
  Design system toàn diện cho dự án Hệ thống Tích Điểm HL Badminton Sport.
  Bao gồm: bảng màu, typography, component patterns, layout conventions và
  animation guidelines. Đọc skill này TRƯỚC KHI viết bất kỳ component UI nào.
---

# HL Sport – Design System

## 1. Màu Sắc (Color Palette)

### Brand Colors (Màu thương hiệu chính)
```
Sidebar Gradient:  linear-gradient(180deg, #207D43 0%, #1B6C39 40%, #134F29 100%)
Primary Green:     #1B6C39  (text-[#1B6C39])
Light Green:       #207D43  (bg-[#207D43])
Dark Green:        #134F29

CSS Variables:
  --primary:          #059669  (emerald-600)
  --background:       #f8fafc  (slate-50)
  --foreground:       #0f172a  (slate-900)
  --card:             #ffffff
  --border:           #e2e8f0  (slate-200)
```

### Semantic Colors (Màu ngữ nghĩa – phải dùng ĐÚNG ngữ cảnh)
| Ý nghĩa           | Text               | Background      | Border             |
|--------------------|--------------------|-----------------|--------------------|
| **Primary/Success**| `text-emerald-600` | `bg-emerald-50` | `border-emerald-100` |
| EARN (Tích điểm)  | `text-emerald-800` | `bg-emerald-100`| —                  |
| REDEEM (Dùng điểm)| `text-rose-800`    | `bg-rose-100`   | —                  |
| EXPIRE (Hết hạn)  | `text-amber-800`   | `bg-amber-100`  | —                  |
| ADJUST (Điều chỉnh)| `text-blue-800`   | `bg-blue-100`   | —                  |
| REFUND (Hoàn điểm)| `text-indigo-800`  | `bg-indigo-100` | —                  |
| Danger/Delete     | `text-rose-600`    | `bg-rose-50`    | `border-rose-200`  |
| Warning           | `text-amber-600`   | `bg-amber-50`   | `border-amber-100` |
| Info              | `text-blue-600`    | `bg-blue-50`    | `border-blue-200`  |
| Neutral           | `text-slate-600`   | `bg-slate-50`   | `border-slate-200` |

### KPI Card Colors (Màu card theo loại dữ liệu)
```
Tổng KH:      text-blue-600   / bg-blue-50   / border-blue-100
KH có điểm:   text-emerald-600 / bg-emerald-50 / border-emerald-100
Điểm lưu hành: text-amber-600  / bg-amber-50  / border-amber-100  (highlight: ring-amber-400/30)
Tổng cộng:    text-teal-600   / bg-teal-50   / border-teal-100
Đã dùng:      text-indigo-600 / bg-indigo-50 / border-indigo-100
Hết hạn:      text-rose-600   / bg-rose-50   / border-rose-100
```

---

## 2. Typography

```
Font:    Inter (Google Fonts) – subsets: ['latin', 'vietnamese']
Import:  import { Inter } from 'next/font/google';
         const inter = Inter({ subsets: ['latin', 'vietnamese'] });

Heading h1:  text-base sm:text-lg font-bold text-slate-900
Section h3:  text-base font-bold text-slate-900
Label:       text-xs font-semibold text-slate-500 uppercase tracking-wider
Value large: text-xl sm:text-2xl font-black text-slate-900 tracking-tight
Value small: text-sm font-semibold text-slate-700
Subtitle:    text-xs text-slate-400 font-medium
Body text:   text-sm text-slate-700
Micro text:  text-[10px] / text-[11px] text-slate-400 font-medium
Mono data:   font-mono (for phone, time, amounts)
```

---

## 3. Layout & Spacing

### App Shell
```
Sidebar:    w-64 (expanded) | w-20 (collapsed) | fixed, z-50
Header:     h-16, sticky top-0 z-30, bg-white/80 backdrop-blur-md
Main:       p-4 sm:p-6 lg:p-8, max-w-7xl mx-auto
Body bg:    bg-slate-50
```

### Section Spacing
```
Page sections:     space-y-6
Grid gaps:         gap-3 sm:gap-4  |  gap-6
Section padding:   p-5 sm:p-6
```

### Grid Patterns
```
KPI Cards:     grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4
Dashboard 2-col: grid grid-cols-1 lg:grid-cols-12 gap-6  (left: lg:col-span-7, right: lg:col-span-5)
Form 2-col:    grid grid-cols-2 gap-3
```

---

## 4. Component Patterns

### Card (Panel cơ bản)
```tsx
<div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
  {/* Header row */}
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-emerald-600" />
      <h3 className="text-base font-bold text-slate-900">Tiêu đề</h3>
    </div>
    {/* Optional action */}
  </div>
  {/* Content */}
</div>
```

### KPI Card
```tsx
<div className={`p-4 rounded-2xl bg-white border ${borderColor} shadow-xs hover:shadow-md transition-all`}>
  <div className="flex items-center justify-between mb-3">
    <span className="text-xs font-semibold text-slate-500 line-clamp-1">{title}</span>
    <div className={`p-2 rounded-xl ${bgColor} ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
  </div>
  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{value}</div>
  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{subtitle}</p>
</div>
```

### Badge / Pill (Transaction type)
```tsx
<span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${colorClass}`}>
  {label}
</span>
```

### Button – Primary (Tích điểm / Hành động chính)
```tsx
<button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm">
  Xác nhận
</button>
```

### Button – Secondary
```tsx
<button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors">
  Hủy
</button>
```

### Button – Danger
```tsx
<button className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-colors">
  Xóa
</button>
```

### Input Field
```tsx
<div>
  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Label</label>
  <input
    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white
               focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
               transition-all placeholder:text-slate-400"
  />
</div>
```

### Select Field
```tsx
<select className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white
                   focus:outline-none focus:ring-2 focus:ring-emerald-500
                   transition-all appearance-none cursor-pointer">
```

### Table (Data table)
```tsx
<div className="overflow-x-auto">
  <table className="w-full text-left text-xs">
    <thead>
      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
        <th className="py-2 px-3">Cột</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      <tr className="hover:bg-slate-50/80 transition-colors">
        <td className="py-3 px-3 text-slate-700">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Modal (Full-screen overlay)
```tsx
// Dùng createPortal + fixed overlay
{isOpen && mounted && createPortal(
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
    {/* Modal box */}
    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Tiêu đề modal</h3>
            <p className="text-xs text-slate-500">Mô tả ngắn</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      {/* Body */}
      <div className="p-5 space-y-4">...</div>
      {/* Footer */}
      <div className="flex gap-3 p-5 bg-slate-50 border-t border-slate-100">
        <button onClick={onClose} className="flex-1 ...secondary...">Hủy</button>
        <button className="flex-1 ...primary...">Xác nhận</button>
      </div>
    </div>
  </div>,
  document.body
)}
```

### Empty State
```tsx
<div className="py-16 text-center text-slate-400">
  <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
  <p className="font-semibold text-sm">Không có dữ liệu</p>
  <p className="text-xs mt-1">Mô tả trạng thái rỗng</p>
</div>
```

### Loading Spinner
```tsx
<div className="flex justify-center py-16">
  <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
</div>
```

### Section Header with Icon
```tsx
<div className="flex items-center gap-2">
  <Icon className="w-4 h-4 text-emerald-600" />
  <h3 className="text-base font-bold text-slate-900">Tiêu đề</h3>
</div>
```

---

## 5. Sidebar Navigation

```
Background:  linear-gradient(180deg, #207D43 0%, #1B6C39 40%, #134F29 100%)
Nav item active:    bg-white text-[#1B6C39] shadow-md
Nav item hover:     bg-black/15 text-white
Nav item normal:    text-emerald-100
Icon active:        text-[#1B6C39]
Icon hover/normal:  text-emerald-200 → text-white
Border color:       border-[#15592e]
```

---

## 6. Header

```
bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 h-16
Avatar ADMIN:  bg-gradient-to-br from-[#207D43] to-[#134F29]
Avatar STAFF:  bg-gradient-to-br from-blue-600 to-indigo-700
Dropdown:      bg-white border border-slate-200 rounded-2xl shadow-xl animate-fade-in
```

---

## 7. Animations

```css
/* globals.css - đã có */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

/* Glass panel */
.glass-panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid #e2e8f0;
}
```

**Rules:**
- Dùng `transition-all` hoặc `transition-colors` cho interactive elements
- Hover trên cards: `hover:shadow-md`
- Hover trên rows: `hover:bg-slate-50/80`
- Icons trong group: `group-hover:scale-110` để micro-animation

---

## 8. Toast Notifications

```tsx
// Sử dụng hook
const { success, error, info } = useToast();

success('Tích điểm thành công!', 'Khách nhận được 120 điểm');
error('Lỗi hệ thống', 'Không thể kết nối database');
info('Thông báo', 'Phiên làm việc đã kết thúc');
```

**KHÔNG** tự tạo alert/notification. Luôn dùng `useToast()`.

---

## 9. Responsive Breakpoints

```
Mobile first → sm (640px) → md (768px) → lg (1024px) → xl (1280px)

Text: text-sm → text-base (sm:)
Padding: p-4 → p-6 (sm:) → p-8 (lg:)
Grid: grid-cols-1 → (sm:) → (lg:) cols
Sidebar: hidden mobile, visible lg:
```

---

## 10. Icon Convention

- Luôn dùng **lucide-react** (đã cài)
- Size chuẩn: `w-4 h-4` (inline), `w-5 h-5` (button), `w-6 h-6` (section icon), `w-8 h-8` (empty state)
- Màu icon theo context: `text-emerald-600` (primary), `text-slate-500` (neutral), `text-rose-600` (danger)

```tsx
import { PlusCircle, Users, History, Settings, ... } from 'lucide-react';
```
