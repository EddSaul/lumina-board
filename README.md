<div align="center">

  <h1 align="center">✨ Lumina Board</h1>

  <p align="center">
    <img src="https://img.shields.io/badge/React-19.2.3-61dafb?style=for-the-badge&logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  </p>

  <p align="center">
    <strong>A beautiful, collaborative whiteboard application with real-time features</strong>
  </p>

  <p align="center">
    Capture ideas, collaborate in real-time, and bring your creative vision to life.
  </p>
</div>

---

## 🌟 Features

- **🔐 Secure Authentication**
  - Google OAuth integration
  - Email/Password authentication
  - Automatic user profile creation
  - Persistent sessions

- **🎨 Beautiful UI/UX**
  - Modern, hand-drawn aesthetic
  - Smooth animations and transitions
  - Dark/Light theme support
  - Responsive design

- **📊 Dashboard**
  - Organize boards by folders
  - Quick search functionality
  - Recent boards view
  - Favorites system

- **🎯 Interactive Canvas**
  - Drawing tools (coming soon)
  - Shape creation (coming soon)
  - Real-time collaboration (coming soon)
  - Undo/Redo functionality

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Supabase account** (free tier works perfectly)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/EddSaul/lumina-board.git
   cd lumina-board
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

   Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Configure Supabase**

   Your project already has:
   - ✅ Auth tables configured
   - ✅ User profiles table with RLS
   - ✅ Auto-profile creation trigger

   You just need to enable Google OAuth:
   - Go to [Authentication > Providers](https://supabase.com/dashboard/project/_/auth/providers) in your Supabase dashboard
   - Enable Google provider
   - Add your OAuth credentials

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗄️ Database Schema

### Profiles Table

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- **RLS enabled** with policies for secure access
- **Auto-creation** via database trigger on user signup
- **Automatic sync** with Google profile data

---

## 🎨 Customization

### Theme Configuration

The app supports light and dark themes. Customize colors in your Tailwind config or CSS variables:

```css
/* Light Theme */
--cream-50: #fefbf7;
--ink-900: #1a1a1a;

/* Dark Theme */
--zinc-950: #0a0a0a;
--orange-500: #f97316;
```

### Adding Custom Fonts

The project uses the "Architects Daughter" font for a hand-drawn feel. Update in `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap" rel="stylesheet">
```

---

## 🔒 Security

- ✅ Environment variables for sensitive data
- ✅ Row Level Security (RLS) on all tables
- ✅ Secure function execution with `search_path`
- ✅ HTTPS-only connections to Supabase
- ✅ No hardcoded secrets in repository

**Note:** Never commit `.env` files. The `.gitignore` is configured to exclude them.

---

## 🚧 Roadmap

- [ ] Real-time collaboration with WebSockets
- [ ] Advanced drawing tools (pen, shapes, text)
- [ ] Board sharing and permissions
- [ ] Export boards (PNG, PDF, SVG)
- [ ] Comments and annotations
- [ ] Board templates
- [ ] Mobile app (React Native)
- [ ] AI-powered suggestions

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Supabase** - For the amazing backend infrastructure
- **Lucide** - For the beautiful icon set
- **Tailwind CSS** - For the utility-first CSS framework
- **Vite** - For the lightning-fast build tool

---

<div align="center">

Made with ❤️ by [EddSaul](https://github.com/EddSaul)

**[Live Demo](#)** • **[Report Bug](https://github.com/EddSaul/lumina-board/issues)** • **[Request Feature](https://github.com/EddSaul/lumina-board/issues)**

</div>