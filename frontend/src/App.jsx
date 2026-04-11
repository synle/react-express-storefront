import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import OrderConfirmation from './pages/OrderConfirmation';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/order/:id" element={<OrderConfirmation />} />
        </Routes>
      </main>
      <footer className="footer">
        <p>ShopSimple Demo &mdash; Stripe + PayPal + Google Pay + Apple Pay</p>
      </footer>
    </div>
  );
}
