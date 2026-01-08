# Contact Collector - Frontend

A modern React-based SPA for managing contacts with OCR capabilities, multi-language support, and role-based access control.

## 🚀 Tech Stack

- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Google GenAI** - OCR for extracting contacts from images
- **XLSX** - Excel export functionality
- **jsPDF** - PDF export with auto-table support

## 📋 Features

### Core Features
- 📇 **Contact Management** - Full CRUD operations for contacts
- 🔍 **OCR Wizard** - Extract contacts from images using Google Gemini AI
- 📊 **Dashboard** - Overview statistics and analytics
- 🔐 **Authentication** - Login, register, password reset
- 👥 **User Management** - Admin panel for user administration
- 🔑 **API Key Management** - Generate and manage API keys for public endpoints

### User Experience
- 🌓 **Theme Support** - Light and dark mode
- 🌐 **Internationalization** - Multi-language support (i18n)
- 📱 **Responsive Design** - Mobile-friendly interface
- 🔔 **Toast Notifications** - User feedback with undo support
- ⚡ **Real-time Updates** - Optimistic UI updates

### Data Management
- 📤 **Export Options** - Export contacts to Excel and PDF
- 📥 **Bulk Import** - Batch contact creation via OCR
- ✏️ **Bulk Edit** - Edit multiple contacts at once
- 🗑️ **Bulk Delete** - Delete multiple contacts with undo

## 📁 Project Structure

```
frontend/
├── components/          # Reusable UI components
│   ├── AddContactModal.tsx
│   ├── ApiKeyCard.tsx
│   ├── BulkEditModal.tsx
│   ├── ContactDetailModal.tsx
│   ├── ContactsTable.tsx
│   ├── Dashboard.tsx
│   ├── ExportModal.tsx
│   ├── FilterBar.tsx
│   ├── Header.tsx
│   ├── OcrWizardModal.tsx
│   ├── PasswordInput.tsx
│   ├── Sidebar.tsx
│   ├── Toast.tsx
│   └── icons.tsx
├── pages/               # Page components
│   ├── ApiPage.tsx
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── Overview.tsx
│   ├── RegisterPage.tsx
│   ├── Settings.tsx
│   └── UserManagement.tsx
├── services/            # API service layer
│   ├── apiKeyService.ts
│   ├── authService.ts
│   ├── avatarService.ts
│   ├── contactService.ts
│   ├── dashboardService.ts
│   ├── geminiService.ts
│   └── userService.ts
├── hooks/               # Custom React hooks
│   └── useLocalStorage.ts
├── App.tsx              # Main application component
├── constants.ts         # Application constants
├── i18n.ts              # Internationalization config
├── types.ts             # TypeScript type definitions
├── index.tsx            # Application entry point
└── vite.config.ts       # Vite configuration
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment (if needed):**
   
   Update `constants.ts` to point to your backend API URL.

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

## 🔧 Configuration

### API Configuration
The frontend connects to the Laravel backend API. Configure the base URL in `constants.ts`:

```typescript
export const API_BASE_URL = 'http://localhost:8000/api';
```

### Google Gemini AI (OCR)
For OCR functionality, configure your Google GenAI API key in the application settings.

## 👤 User Roles

| Role | Capabilities |
|------|-------------|
| **User** | Manage own contacts, API keys, profile settings |
| **Admin** | All user capabilities + user management, system overview |

## 📊 Data Types

### Contact
```typescript
interface Contact {
  id: string;
  fullName: string;
  phone: string;      // E.164 format
  email: string;
  company: string;
  jobTitle: string;
  source: 'ocr_list' | 'form' | 'import' | 'manual';
  consent: 'opt_in' | 'opt_out' | 'unknown';
  createdAt: Date;
}
```

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'user' | 'admin';
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}
```

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## 🔗 Related

- [Backend README](../backend/README.md) - Laravel API documentation
- [Main README](../README.md) - Project overview

## 📄 License

MIT License
