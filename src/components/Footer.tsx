import React from 'react';

export function Footer() {
  return (
    <footer className="bg-[#1C1E21]/60 backdrop-blur-sm border-t border-[#2A2D31]/50 py-8">
      <div className="max-w-7xl mx-auto px-6 text-center text-gray-400">
        <p>© 2024 Maguinho. Todos os direitos reservados.</p>
        <p className="mt-2">
          Desenvolvido por <a href="https://amageweb.com" className="text-[#00E7C1] hover:underline">amage</a>
        </p>
      </div>
    </footer>
  );
}
