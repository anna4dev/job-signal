export default function Footer() {
  return (
    <footer className="mt-20 py-8 border-t border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Job Signal</p>
        <p>
          Built with ❤️ by{" "}
          <a
            href="https://anna4code.dev/"
            target="_blank"
            className="font-medium text-blue-600 hover:underline transition-colors"
          >
            Anna4code
          </a>
        </p>
      </div>
    </footer>
  );
}
