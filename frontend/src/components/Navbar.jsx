import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          ShopSimple
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link">Products</Link>
          <Link to="/cart" className="nav-link cart-link">
            Cart
            {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
          </Link>

          {user ? (
            <div className="user-menu">
              <img src={user.picture} alt="" className="user-avatar" referrerPolicy="no-referrer" />
              <span className="user-name">{user.name}</span>
              <button onClick={logout} className="btn btn-sm btn-outline">Logout</button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-sm btn-primary">Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
