import { BrowserRouter, Routes, Route } from "react-router-dom";

function Home() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Gestión de Lotes</h1>
      <p>Sistema en construcción — estructura base lista.</p>
    </div>
  );
}

// TODO: agregar páginas y rutas cuando se defina el dominio del sistema

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
