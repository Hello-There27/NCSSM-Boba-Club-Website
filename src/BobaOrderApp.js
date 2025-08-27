import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, Clock, User, TrendingUp, Shield, Download, Eye, Lock, Wifi, WifiOff } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const BobaOrderApp = () => {
  const [cart, setCart] = useState([]);
  const [currentOrder, setCurrentOrder] = useState({
    category: '',
    flavor: '',
    teaBase: '', // New field for tea base
    size: 'Regular',
    iceLevel: '50%',
    sugarLevel: '100%',
    toppings: [],
    crystalBoba: false,
    quantity: 1
  });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('');
  
  // Updated state management
  const [totalOrders, setTotalOrders] = useState({
    count: 0,
    totalValue: 0
  });
  
  // Admin mode state
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [allOrders, setAllOrders] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [orderCounter, setOrderCounter] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showOrderList, setShowOrderList] = useState(false);
  // Additional info for order (not required, not in CSV)
  const [connectionStatus, setConnectionStatus] = useState('unknown'); // 'connected', 'disconnected', 'testing', 'unknown'
  
  const ADMIN_PASSWORD = "bobaadmin123";
  const MINIMUM_ORDERS = 20;



  // Load orders and stats when component mounts
  useEffect(() => {
    testConnection();
    loadOrdersFromDatabase();
    loadOrderStats();
  }, []);

  // Auto-delete orders pending for over 15 minutes and clean up local state
  useEffect(() => {
    const cleanup = async () => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .lt('timestamp', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .is('paid', false)
        .is('picked_up', false);
      
      if (error) {
        console.error('Error cleaning up old orders:', error);
        return;
      }
      
      // Clean up local state
      setAllOrders(prevOrders => {
        const now = new Date();
        return prevOrders.filter(order => {
          if (!order.timestamp || order.paid || order.pickedUp) return true;
          const orderTime = new Date(order.timestamp);
          const diffMinutes = (now - orderTime) / 60000;
          return diffMinutes <= 15;
        });
      });
    };
    
    // Run cleanup every minute
    const interval = setInterval(cleanup, 60000);
    cleanup(); // Run once when component mounts
    
    return () => clearInterval(interval);
  }, []);

  const testConnection = async () => {
    setConnectionStatus('testing');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables.');
      console.error('❌ Missing Supabase URL or anon key. Check your .env file.');
      setConnectionStatus('disconnected');
      return;
    }

    try {
      // Call the health_check RPC function
      const { data, error } = await supabase.rpc('health_check');

      if (error) {
        console.error('Connection test failed:', error);
        setConnectionStatus('disconnected');
        console.error(`Database connection error: ${error.message}`);
      } else {
        console.log('✅ Connected to Supabase. Health check result:', data);
        setConnectionStatus('connected');
        console.error('✅ Successfully connected to the database!');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      console.error(`Failed to connect to database: ${err.message}`);
      setConnectionStatus('disconnected');
    }
  };

  // Require tea base for tea drinks
  const teaCategories = [
    'Classic Milk Tea', 'Other Tea', 'Milk Tea', 'Premium Milk Tea', 'Panda Milk Tea', 'Fruit Tea'
  ];
  const showTeaBaseOption = (category) => teaCategories.includes(category);
  const requiresTeaBase = (category) => teaCategories.includes(category);

  // Available tea bases
  const teaBases = ['Black Tea', 'Green Tea'];

  // Load all orders from Supabase
  const loadOrdersFromDatabase = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading orders:', error);
      console.error(`Database error: ${error.message}. Please check your Supabase setup.`);
      return;
    }

    // Keep existing order numbers and data
    setAllOrders(data || []);
    
    // Set the next order counter based on the highest existing order number
    const maxOrderNumber = (data || []).reduce((max, order) => 
      Math.max(max, order.order_number || 0), 0);
    setOrderCounter(maxOrderNumber + 1);
  };

  // Load order statistics from Supabase
  const loadOrderStats = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('quantity, price');

      if (error) {
        console.error('Error loading stats:', error);
        return;
      }

      if (data) {
        const count = data.reduce((sum, order) => sum + order.quantity, 0);
        const totalValue = data.reduce((sum, order) => sum + order.price, 0);
        setTotalOrders({ count, totalValue });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Reassign order numbers sequentially
  const reassignOrderNumbers = (orders) => {
    return orders.map((order, index) => ({
      ...order,
      order_number: index + 1
    }));
  };

  // No longer needed - all database operations are done in handleSubmitOrder

  // Your existing drink categories and other constants remain the same
  const drinkCategories = {
    'Classic Milk Tea': {
      price: 3.99,
      flavors: ['Classic', 'Jasmine']
    },
    'Other Tea': {
      price: 3.85,
      flavors: ['Classic Tea', 'Jasmine Tea']
    },
    'Milk Tea': {
      price: 4.45,
      flavors: [
        'Almond', 'Banana', 'Blueberry', 'Blue Raspberry', 'Cantaloupe', 'Chocolate', 'Chocolate-Covered Strawberries',
        'Coconut', 'Gingerbread', 'Ginger', 'Grapefruit', 'Green Apple', 'Hazelnut', 'Honey Dew', 'Honey',
        'Lychee', 'Mango', 'Maple', 'Matcha', 'Passion Fruit', 'Peach', 'Peppermint', 'Raspberry',
        'Red Bean', 'Rose', 'Strawberry', 'Taro', 'Thai', 'Tiger', 'Tiramisu', 'Vanilla', 'Watermelon', 'Yin & Yang'
      ]
    },
    'Premium Milk Tea': {
      price: 4.55,
      flavors: ['Hokkaido (Caramel w/Classic)', 'Okinawa (Brown Sugar w/Classic']
    },
    'Panda Milk Tea': {
      price: 4.75,
      flavors: ['Panda Special']
    },
    'Fruit Tea': {
      price: 4.25,
      flavors: [
        'Almond', 'Banana', 'Blueberry', 'Cantaloupe', 'Champagne Grape',
        'Ginger', 'Green Apple', 'Honey Dew', 'Honey', 'Honey Lemon', 'Kiwi',
        'Lemon', 'Lychee', 'Mango', 'Orange', 'Passion Fruit', 'Peach',
        'Pineapple', 'Raspberry', 'Sour Plum', 'Strawberry', 'Strawberry-Mango Mix'
      ]
    },
    'Coffee': {
      price: 4.85,
      flavors: [
        'Iced Caramel Latte', 'Iced Mocha', 'Vietnamese Coffee'
      ]
    },
    'Slush': {
      price: 5.35,
      flavors: [
        'Blueberry', 'Cantaloupe', 'Champagne Grape', 'Green Apple', 'Honey Dew',
        'Honey', 'Kiwi', 'Lemon', 'Lychee', 'Mango', 'Matcha', 'Orange',
        'Passion Fruit', 'Peach', 'Peppermint', 'Pineapple', 'Red Bean',
        'Sour Plum', 'Strawberry'
      ]
    },
    'Snow': {
      price: 5.45,
      flavors: [
        'Almond', 'Cantaloupe', 'Caramel', 'Chocolate', 'Coconut', 'Green Apple',
        'Honey Dew', 'Kiwi', 'Lychee', 'Mango', 'Orange', 'Passion Fruit',
        'Peach', 'Peppermint', 'Pineapple', 'Sour Plum', 'Strawberry', 'Taro'
      ]
    },
    'Coffee Snow': {
      price: 5.85,
      flavors: [
        'Mocha Snow', 'Aloha Mocha Snow'
      ]
    },
    'Oreo Snow': {
      price: 5.75,
      flavors: [
        'Normal'
      ]
    },
    'Café au Lait (Iced)': {
      price: 4.45,
      flavors: [
        'Normal'
      ]
    },
    'Coffee Slush': {
      price: 4.55,
      flavors: [
        'Normal'
      ]
    },
    'Iced Latte': {
      price: 4.75,
      flavors: [
        'Normal'
      ]
    },
  };

  const toppings = [
    'Honey Boba', 'Crystal Boba (+20¢)', 'Popping Boba (Mango)', 'Popping Boba (Strawberry)',
    'Popping Boba (Lychee)', 'Popping Boba (Passionfruit)', 'Popping Boba (Blueberry)', 'Popping Boba (Kiwi)', 
    'Popping Boba (Peach)','Mango Stars', 'Strawberry Hearts', 'Green Apple Jelly', 'Lychee Jelly',
    'Rainbow Jelly', 'Coffee Jelly', 'Red Bean', 'Grass Jelly (+15¢)',
    'Egg Pudding (+15¢)'
  ];

  const iceLevels = ['No Ice', '25%', '50%', '75%', '100%'];
  const sugarLevels = ['0%', '30%', '50%', '70%', '100%'];


  // Toggle this to enable/disable time-based ordering restriction
  // Set to false to always allow ordering (for testing or special events)
  const ENABLE_ORDER_TIME_RESTRICTION = true;

  // Only allow ordering during specific days/times if enabled
  const isOrderingOpen = () => {
  // If restriction is off, always allow ordering
  if (!ENABLE_ORDER_TIME_RESTRICTION) return true;
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    // Only allow ordering on Tuesday (2) or Wednesday (3), 8:30am-1:30pm
    if ((day === 2 || day === 3) && (hour > 8 || (hour === 8 && minute >= 30)) && (hour < 13 || (hour === 13 && minute < 30))) {
      return true;
    }
    return false;
  };

  const getOrderingStatus = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    if ((day === 2 || day === 3) && hour >= 8 && hour < 14) {
      if (hour === 8 && minute < 30) {
        return "Opening at 8:30 AM";
      } else if (hour === 13 && minute >= 30) {
        return "ORDERS CLOSED - Delivery at 4:45 PM";
      } else {
        return "COLLECTING ORDERS - Closes 1:30 PM";
      }
    }
    return "Orders open Tuesdays & Wednesdays 8:30 AM - 1:30 PM";
  };

  // Calculate item price based on menu and toppings
  const calculateItemPrice = (item) => {
    const categoryInfo = drinkCategories[item.category];
    if (!categoryInfo) return 0;
    let basePrice = categoryInfo.price;
    // Topping pricing (see menu):
    // - Crystal Boba: $0.20 (should be 20¢)
    // - Grass Jelly, Egg Pudding: $0.15 (15¢)
    // - All other toppings: $0.70 (70¢)
    let toppingsPrice = 0;
    item.toppings.forEach(topping => {
      if (topping.includes('Crystal Boba')) {
        toppingsPrice += 0.20;
      } else if (topping.includes('Grass Jelly') || topping.includes('Egg Pudding')) {
        toppingsPrice += 0.15;
      } else {
        toppingsPrice += 0.70;
      }
    });
    // If crystalBoba is checked as a separate boolean, add it (legacy support)
    const crystalBobaPrice = item.crystalBoba ? 0.20 : 0;
    // Size upgrade: Large +$0.85
    const sizeUpgrade = item.size === 'Large' ? 0.85 : 0;
    // Bulk discount: 20% off
    const subtotal = (basePrice + toppingsPrice + crystalBobaPrice + sizeUpgrade) * item.quantity;
    const discounted = subtotal * 0.8;
    // Add sales tax per item
    const taxed = Math.round((discounted * 1.075) * 100) / 100;
    return taxed;
  };

  // Updated addToCart function - only updates local state
  const addToCart = () => {
    if (!currentOrder.category || !currentOrder.flavor) {
      alert('Please select a drink category and flavor');
      return;
    }
    
    setLoading(true);
    
    const orderWithId = {
      ...currentOrder,
      id: `temp_${Date.now()}`, // Temporary ID until order is submitted
      price: calculateItemPrice(currentOrder),
      orderNumber: null, // Will be assigned when submitted
      customerName: 'Pending',
      paymentMethod: 'Not Selected',
      timestamp: new Date().toISOString(),
      paid: false,
      pickedUp: false
    };
    
    // Only update cart - don't save to database yet
    setCart([...cart, orderWithId]);
    
    // Reset form
    setCurrentOrder({
      category: '',
      flavor: '',
      teaBase: '',
      size: 'Regular',
      iceLevel: '50%',
      sugarLevel: '50%',
      toppings: [],
      crystalBoba: false,
      quantity: 1
    });
    
    setLoading(false);
  };

  // Updated removeFromCart function - only removes from cart, no database operations
  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const updateQuantity = (change) => {
    const newQuantity = Math.max(1, currentOrder.quantity + change);
    setCurrentOrder({ ...currentOrder, quantity: newQuantity });
  };

  const handleToppingChange = (toppingName) => {
    const newToppings = currentOrder.toppings.includes(toppingName)
      ? currentOrder.toppings.filter(t => t !== toppingName)
      : [...currentOrder.toppings, toppingName];
    setCurrentOrder({ ...currentOrder, toppings: newToppings });
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price, 0);
  };

  const getSubtotal = () => {
    return getTotalPrice();
  };

  const getSalesTax = () => {
    return getSubtotal() * 0.075;
  };

  // Final total includes sales tax (7.5%)
  const getFinalTotal = () => {
    // Add tax after discount
    const subtotal = getSubtotal();
    const tax = subtotal * 0.075;
    return Math.round((subtotal + tax) * 100) / 100;
  };

  const handleAdminClick = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminMode(true);
      setShowPasswordModal(false);
      setPasswordInput('');
    } else {
      alert('Incorrect password');
      setPasswordInput('');
    }
  };

  // Updated toggleOrderStatus function - deletes order when both paid and picked up and reassigns numbers
  const toggleOrderStatus = async (orderId, field) => {
    const order = allOrders.find(o => o.id === orderId);
    if (order) {
      const newValue = !order[field];
      const updatedOrder = { ...order, [field]: newValue };
      
      // Check if both paid and picked up will be true after this update
      const shouldDelete = updatedOrder.paid && updatedOrder.picked_up;
      
      if (shouldDelete) {
        // Delete order completely from database
        try {
          const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId);

          if (error) {
            console.error('Error deleting order:', error);
            alert(`Failed to delete order: ${error.message}`);
            return;
          }

          // Remove from local state and reassign order numbers
          const updatedOrders = allOrders.filter(o => o.id !== orderId);
          const reorderedOrders = reassignOrderNumbers(updatedOrders);
          setAllOrders(reorderedOrders);
          
          // Update total orders count (subtract this order's quantity and price)
          setTotalOrders(prev => ({
            count: Math.max(0, prev.count - order.quantity),
            totalValue: Math.max(0, prev.totalValue - order.price)
          }));
          
          // Update order counter
          setOrderCounter(reorderedOrders.length + 1);
          
          console.log(`Order #${order.order_number} completed and removed from database`);
          
        } catch (error) {
          console.error('Error deleting order:', error);
          alert(`Failed to delete completed order: ${error.message}`);
        }
      } else {
        // Update the field in database directly
        try {
          const { error } = await supabase
            .from('orders')
            .update({ [field]: newValue })
            .eq('id', orderId);
            
          if (error) {
            console.error('Error updating order:', error);
            alert(`Failed to update order: ${error.message}`);
            return;
          }
          
          // Update local state
          setAllOrders(prev => 
            prev.map(order => 
              order.id === orderId 
                ? { ...order, [field]: newValue }
                : order
            )
          );
        } catch (error) {
          console.error('Error updating order:', error);
          alert(`Failed to update order status: ${error.message}`);
        }
      }
    }
  };

  const getVisibleOrders = () => {
    // Since completed orders are now deleted, just return all orders
    return allOrders;
  };

  const PaymentInfo = () => {
    const paymentDetails = {
      venmo: { info: '@megcherry63', note: 'Indicate the payment is for Boba, First 4 digits are 4363' },
      zelle: { info: 'Talk to us at pickup', note: 'Include the payment is for Boba' },
    };

    // If no payment method is selected, show default message
    if (!paymentMethod || !paymentDetails[paymentMethod]) {
      return (
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 text-lg font-medium mb-2 text-purple-800">
            <span>Please select a payment method</span>
          </div>
        </div>
      );
    }

    const current = paymentDetails[paymentMethod];
    
    return (
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <div className="flex items-center gap-2 text-lg font-medium mb-2 text-purple-800">
          <span className="capitalize">{paymentMethod} Payment</span>
        </div>
        <p className="text-purple-700 font-medium">{current.info}</p>
        <p className="text-sm text-purple-600 mt-2">{current.note}</p>
      </div>
    );
  };

  const exportToCSV = () => {
    const visibleOrders = getVisibleOrders();
    if (visibleOrders.length === 0) {
      alert('No orders to export');
      return;
    }

    const headers = [
      'Order Number',
      'Customer Name',
      'Drink Category',
      'Flavor',
      'Tea Base',
      'Size',
      'Ice Level',
      'Sugar Level',
      'Regular Topping 1',
      'Regular Topping 2',
      'Special Topping (+25¢)',
      'Crystal Boba (+30¢)',
      'Quantity',
      'Price'
    ];

    const csvData = visibleOrders.map(order => {
      const regularToppings = [];
      const specialToppings = [];
      let hasCrystalBoba = order.crystal_boba;

      if (order.toppings) {
        order.toppings.forEach(topping => {
          if (topping.includes('+25¢')) {
            specialToppings.push(topping);
          } else if (topping.includes('+30¢') || topping === 'Crystal Boba (+30¢)') {
            hasCrystalBoba = true;
          } else {
            regularToppings.push(topping);
          }
        });
      }

      return [
        order.order_number,
        order.customer_name || 'Pending',
        order.category,
        order.flavor,
        order.tea_base || 'N/A',
        order.size,
        order.ice_level,
        order.sugar_level,
        regularToppings[0] || '',
        regularToppings[1] || '',
        specialToppings[0] || '',
        hasCrystalBoba ? 'Yes' : '',
        order.quantity,
        order.price.toFixed(2)
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `boba-orders-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const PasswordModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-800">Admin Access</h2>
          </div>
          <p className="text-gray-600 mb-4">Enter the admin password to access the admin panel:</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            placeholder="Enter password"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              onClick={handlePasswordSubmit}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Access Admin
            </button>
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setPasswordInput('');
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AdminPanel = () => {
    const visibleOrders = getVisibleOrders();
    
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-red-600">🔐 Admin Panel</h1>
            <p className="text-gray-600 mt-2">View and manage all boba orders</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => setIsAdminMode(false)}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Customer View
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800">Active Orders</h3>
            <p className="text-3xl font-bold text-blue-600">{visibleOrders.length}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-800">Total Items</h3>
            <p className="text-3xl font-bold text-green-600">{totalOrders.count}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-800">Total Revenue</h3>
            <p className="text-3xl font-bold text-purple-600">${totalOrders.totalValue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Active Orders ({visibleOrders.length})
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Completed orders are automatically removed and numbers reassigned)
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleOrders.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                      No active orders
                    </td>
                  </tr>
                ) : (
                  visibleOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{order.flavor}</div>
                        <div className="text-gray-500">{order.category}</div>
                        {order.tea_base && (
                          <div className="text-xs text-blue-600">Tea Base: {order.tea_base}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{order.size} | Ice: {order.ice_level} | Sugar: {order.sugar_level}</div>
                        {((order.toppings && order.toppings.length > 0) || order.crystal_boba) && (
                          <div className="text-gray-500 text-xs">
                            +{[...(order.toppings || []), ...(order.crystal_boba ? ['Crystal Boba'] : [])].join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${order.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          order.payment_method === 'venmo' ? 'bg-blue-100 text-blue-800' :
                          order.payment_method === 'zelle' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.payment_method === 'Not Selected' ? 'Pending' : order.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={order.paid}
                              onChange={() => toggleOrderStatus(order.id, 'paid')}
                              className="mr-2 rounded"
                            />
                            <span className="text-xs">Paid</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={order.picked_up}
                              onChange={() => toggleOrderStatus(order.id, 'picked_up')}
                              className="mr-2 rounded"
                            />
                            <span className="text-xs">Picked Up</span>
                          </label>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const AboutPage = () => {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-purple-600">About NCSSM Quickly's Boba</h1>
          <button
            onClick={() => setShowAbout(false)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="prose max-w-none space-y-6">
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <h2 className="text-2xl font-semibold text-purple-800 mb-4">Purpose</h2>
            <p className="text-gray-700 leading-relaxed">
              This website was created to streamline the boba tea ordering process for NCSSM students. 
              By collecting orders digitally and requiring a minimum number of orders before placing bulk orders through Quickly's, 
              we can provide students with affordable boba tea while ensuring efficient delivery logistics.
            </p>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-2xl font-semibold text-blue-800 mb-4">How It Works</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Students place orders through this website during designated ordering periods</li>
              <li>Orders are collected until we reach the minimum threshold (20 orders)</li>
              <li>Once the minimum is met, bulk orders are placed with Quickly's</li>
              <li>All drinks include a 20% discount from bulk ordering</li>
              <li>Orders are delivered to campus at scheduled times</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h2 className="text-2xl font-semibold text-yellow-800 mb-4">Credits & Acknowledgments</h2>
            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Website Development:</strong> Built by the NCSSM Boba Club Officer Team 2026.
              </p>
              <p>
                <strong>Boba Supplier:</strong> Quickly's - providing high-quality boba tea and allowing bulk ordering discounts.
              </p>
              <p>
                <strong>Special Thanks:</strong> To the NCSSM community for supporting the club and ordering, allowing us to bring high quality Boba to NCSSM.
              </p>
            </div>
          </div>

          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <h2 className="text-2xl font-semibent text-red-800 mb-4">Important Information</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Orders are only accepted during designated time periods (Tuesdays & Wednesdays 8:30 AM - 1:30 PM)</li>
              <li>All prices shown include the 20% bulk ordering discount</li>
              <li>Payment must be completed before pickup</li>
              <li>Orders are delivered to campus at approximately 4:45 PM on order days</li>
              <li>Custom tea base selection is available for most drinks</li>
            </ul>
          </div>

          <div className="text-center pt-6 border-t border-gray-200">
            <p className="text-gray-600">
              Questions or suggestions? Contact the Boba Club Officer Team.
             <p className="text-gray-600">
              Created by Muhilan Krishnan '26 Durham
            </p>
            </p>
              <p className="text-gray-600">
              Unaffiliated wtih NCSSM
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  };


  // Checkout form
  const CheckoutForm = () => {
    const handleSubmitOrder = async () => {
      if (!customerName.trim()) {
        alert('Please enter your name');
        return;
      }

      if (!paymentMethod) {
        alert('Please select a payment method');
        return;
      }
      
      setLoading(true);
      try {
        const timestamp = new Date().toISOString();
        
        console.log('Current cart state:', cart);
        
        console.log('Current payment method:', paymentMethod);
        
        // Format all orders for saving
        const ordersToSave = cart.map((item, index) => ({
          order_number: orderCounter + index,
          customer_name: customerName.trim(),
          payment_method: paymentMethod || 'Not Selected', // Ensure we have a default value
          category: item.category,
          flavor: item.flavor,
          tea_base: item.teaBase || null,
          size: item.size,
          ice_level: item.iceLevel || item.ice_level,
          sugar_level: item.sugarLevel || item.sugar_level,
          toppings: item.toppings || [],
          crystal_boba: item.crystalBoba || item.crystal_boba || false,
          quantity: item.quantity || 1,
          price: parseFloat(item.price.toFixed(2)),
          created_at: timestamp,
          picked_up: false,
          paid: false
        }));
        
        console.log('Attempting to save orders:', ordersToSave);
        
        // Save all orders in a single batch
        const { data: savedOrders, error } = await supabase
          .from('orders')
          .insert(ordersToSave)
          .select();
          
        if (error) {
          console.error('Supabase error details:', error);
          throw new Error(`Failed to save order: ${error.message} (${error.code})`);
        }
        
        // Update UI with saved orders
        if (savedOrders && savedOrders.length > 0) {
          // Update allOrders
          setAllOrders(prev => [...savedOrders, ...prev]);
          
          // Update order counts and totals
          const newItemCount = savedOrders.reduce((sum, order) => sum + (order.quantity || 1), 0);
          const newTotalValue = savedOrders.reduce((sum, order) => sum + order.price, 0);
          
          setTotalOrders(prev => ({
            count: prev.count + newItemCount,
            totalValue: prev.totalValue + newTotalValue
          }));
          
          // Clear the cart
          setCart([]);
          
          // Reset form fields
          setCustomerName('');
          setPaymentMethod('');
          
          // Update order counter
          setOrderCounter(prev => prev + savedOrders.length);
          
          // Show success message and close checkout
          alert('Order submitted successfully!');
          setShowCheckout(false);
        } else {
          alert('Failed to submit order. Please try again.');
        }
      } catch (error) {
        console.error('Error submitting order:', error.message);
        alert(`Error submitting order: ${error.message}. Please try again.`);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="max-w-2xl mx-auto p-6 bg-white min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-purple-600">Checkout</h1>
          <button
            onClick={() => setShowCheckout(false)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="font-medium text-gray-800 mb-4">Order Summary ({cart.length} items)</h2>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start border-b pb-2">
                  <div>
                    <div className="font-medium">{item.flavor}</div>
                    <div className="text-sm text-gray-600">{item.category}</div>
                    <div className="text-sm text-gray-500">
                      {item.size} | Ice: {item.iceLevel} | Sugar: {item.sugarLevel}
                      {item.teaBase && ` | Base: ${item.teaBase}`}
                      {item.toppings.length > 0 && (
                        <div>Toppings: {item.toppings.join(', ')}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>${item.price.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-2 border-t space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>${getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax (7.5%):</span>
                <span>${getSalesTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium text-lg text-purple-600 border-t pt-2 mt-2">
                <span>Total:</span>
                <span>${getFinalTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your name for the order"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">Select payment method</option>
                <option value="venmo">Venmo (@megcherry63)</option>
                <option value="zelle">Zelle (Talk to us at pickup)</option>
              </select>
              <div className="mt-2">
                <PaymentInfo />
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmitOrder}
            disabled={!customerName.trim() || loading}
            className="w-full bg-purple-600 text-white py-4 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Order'}
          </button>
        </div>
      </div>
    );
  };

  if (showCheckout) {
    return <CheckoutForm />;
  }

  if (showAbout) {
    return <AboutPage />;
  }

  if (isAdminMode) {
    return <AdminPanel />;
  }

  if (showOrderList) {
    // My Orders tab: show all orders
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-purple-600">All Orders</h1>
          <button
            onClick={() => setShowOrderList(false)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {allOrders.map(order => (
                <tr key={order.id}>
                  <td className="px-4 py-2">{order.orderNumber || order.order_number || ''}</td>
                  <td className="px-4 py-2">{order.customer_name || order.customerName || ''}</td>
                  <td className="px-4 py-2">{order.flavor} <span className="text-xs text-gray-500">({order.category})</span></td>
                  <td className="px-4 py-2">
                    {order.size} | Ice: {order.iceLevel} | Sugar: {order.sugarLevel}
                    {order.teaBase || order.tea_base ? ` | Tea Base: ${order.teaBase || order.tea_base}` : ''}
                    {order.toppings && order.toppings.length > 0 && (
                      <span> | Add-ons: {order.toppings.join(', ')}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">${order.price ? order.price.toFixed(2) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white min-h-screen">
      {/* Always show header and status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-purple-600">🧋 NCSSM Quickly's Boba</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{getOrderingStatus()}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Admin button is always enabled */}
          <button
            onClick={handleAdminClick}
            className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            <Shield className="w-4 h-4" />
            Admin
          </button>
          <button
            onClick={() => setShowCheckout(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={cart.length === 0 || (ENABLE_ORDER_TIME_RESTRICTION && !isOrderingOpen())}
          >
            <ShoppingCart className="w-4 h-4" />
            Cart ({cart.length})
          </button>
        </div>

        {/* Floating My Orders button, always enabled */}
        <button
          onClick={() => setShowOrderList(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2 text-sm z-10"
        >
          All orders
        </button>
      </div>

      {/* Always show password modal, but only show order form if time restriction allows */}
      {showPasswordModal && <PasswordModal />}
      {/* Show order form only if ordering is open, or if restriction is disabled */}
      {(!ENABLE_ORDER_TIME_RESTRICTION || isOrderingOpen()) ? (
        <>
          {showPasswordModal && <PasswordModal />}
          {/* ...existing code for order status, stats, and form... */}
          {/* Minimum Orders Banner */}
          <div className={`mb-6 p-4 rounded-lg border ${
            totalOrders.count >= MINIMUM_ORDERS 
              ? 'bg-green-100 border-green-200' 
              : 'bg-red-100 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-lg font-semibold ${
                  totalOrders.count >= MINIMUM_ORDERS ? 'text-green-800' : 'text-red-800'
                }`}>
                  {totalOrders.count >= MINIMUM_ORDERS ? '✅ Minimum Orders Met!' : '⚠️ Minimum Orders Required'}
                </span>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  totalOrders.count >= MINIMUM_ORDERS ? 'text-green-600' : 'text-red-600'
                }`}>
                  {totalOrders.count}/{MINIMUM_ORDERS}
                </div>
                <div className={`text-sm ${
                  totalOrders.count >= MINIMUM_ORDERS ? 'text-green-700' : 'text-red-700'
                }`}>
                  Orders
                </div>
              </div>
            </div>
            <div className="mt-2">
              <p className={`text-sm ${
                totalOrders.count >= MINIMUM_ORDERS ? 'text-green-700' : 'text-red-700'
              }`}>
                {totalOrders.count >= MINIMUM_ORDERS 
                  ? 'Great! We have enough orders to place a bulk order.' 
                  : `We need ${MINIMUM_ORDERS - totalOrders.count} more orders to place a bulk order through Quickly's.`
                }
              </p>
            </div>
          </div>

          {/* Order Stats Banner */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-purple-800">Today's Orders</h2>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">{totalOrders.count}</div>
                <div className="text-sm text-purple-700">Total Items</div>
              </div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <span className="text-purple-700">Total Order Value:</span>
              <span className="text-lg font-semibold text-purple-800">${totalOrders.totalValue.toFixed(2)}</span>
            </div>
          </div>

          {/* ...existing code for the order form, cart preview, etc... */}
          <div className="space-y-6">
            {/* Name Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your name for the order"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Payment Method Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="venmo">Venmo (@megcherry63)</option>
                <option value="zelle">Zelle (Talk to us at pickup)</option>
              </select>
              <div className="mt-2">
                <PaymentInfo />
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category * <span className="text-purple-600 text-xs">(All prices include 20% discount)</span>
              </label>
              <select
                value={currentOrder.category}
                onChange={(e) => {
                  const newCategory = e.target.value;
                  setCurrentOrder({
                    ...currentOrder,
                    category: newCategory,
                    flavor: '',
                    teaBase: teaCategories.includes(newCategory) ? 'Black Tea' : ''
                  });
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {Object.entries(drinkCategories).map(([category, info]) => (
                  <option key={category} value={category}>
                    {category} (${(info.price * 0.8).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {currentOrder.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flavor *
                </label>
                <select
                  value={currentOrder.flavor}
                  onChange={(e) => setCurrentOrder({ ...currentOrder, flavor: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a flavor</option>
                  {drinkCategories[currentOrder.category].flavors.map((flavor) => (
                    <option key={flavor} value={flavor}>{flavor}</option>
                  ))}
                </select>
              </div>
            )}

            {currentOrder.category && showTeaBaseOption(currentOrder.category) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tea Base *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {teaBases.map((base) => (
                    <button
                      key={base}
                      onClick={() => setCurrentOrder({ ...currentOrder, teaBase: base })}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        currentOrder.teaBase === base
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-300 hover:border-orange-300'
                      }`}
                    >
                      <div className="font-medium">{base}</div>
                    </button>
                  ))}
                </div>
                {!currentOrder.teaBase && (
                  <div className="text-red-600 text-xs mt-1">Please select a tea base.</div>
                )}
              </div>
            )}

            {currentOrder.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['Regular', 'Large'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setCurrentOrder({ ...currentOrder, size })}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        currentOrder.size === size
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-medium">{size}</div>
                      <div className="text-sm text-gray-600">
                        {size === 'Large' ? '+$0.68 (with discount)' : 'Standard'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentOrder.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ice Level
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {iceLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => setCurrentOrder({ ...currentOrder, iceLevel: level })}
                      className={`p-2 border rounded text-sm transition-colors ${
                        currentOrder.iceLevel === level
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentOrder.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sugar Level
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {sugarLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => setCurrentOrder({ ...currentOrder, sugarLevel: level })}
                      className={`p-2 border rounded text-sm transition-colors ${
                        currentOrder.sugarLevel === level
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-300 hover:border-pink-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentOrder.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Toppings <span className="text-purple-600 text-xs">(48¢ each with discount, unless noted)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {toppings.map((topping) => (
                    <button
                      key={topping}
                      onClick={() => handleToppingChange(topping)}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        currentOrder.toppings.includes(topping)
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:border-green-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{topping}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => updateQuantity(-1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xl font-medium px-4">{currentOrder.quantity}</span>
                <button
                  onClick={() => updateQuantity(1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={addToCart}
              disabled={!currentOrder.category || !currentOrder.flavor || (requiresTeaBase(currentOrder.category) && !currentOrder.teaBase) || loading}
              className="w-full bg-purple-600 text-white py-4 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding...' : `Add to Cart - ${currentOrder.category && currentOrder.flavor ? calculateItemPrice(currentOrder).toFixed(2) : '0.00'}`}
            </button>
          </div>

          {cart.length > 0 && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">Cart Preview ({cart.length} items):</h3>
              {cart.slice(-2).map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm text-gray-600 mb-1">
                  <span>
                    {item.flavor} ({item.category})
                    {item.teaBase && ` - ${item.teaBase}`} x{item.quantity}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>${item.price.toFixed(2)}</span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length > 2 && (
                <div className="text-xs text-gray-500">...and {cart.length - 2} more items</div>
              )}
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal:</span>
                  <span>${getTotalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax (7.5%):</span>
                  <span>${getSalesTax().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium text-purple-600 border-t pt-1">
                  <span>Total:</span>
                  <span>${getFinalTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center mt-16">
          <div className="text-2xl font-bold text-red-600 mb-4">Ordering is currently closed.</div>
          <div className="text-gray-700 text-center mb-6">Please check back during the designated ordering period.<br/>Orders are open Tuesdays & Wednesdays 8:30 AM - 1:30 PM.</div>
          <div className="text-2xl font-bold text-blue-600 mb-4">Payment Information:</div>
          <div className="text-gray-700 text-center mb-6">Venmo handle: @megcherry63<br/>First 4 digits: 4363<br/>If paying Zelle, ask for info during pickup.</div>
        </div>
      )}

      {/* About Button - Fixed Position Bottom Left */}
      <button
        onClick={() => setShowAbout(true)}
        className="fixed bottom-6 left-6 bg-gray-600 text-white px-4 py-2 rounded-full hover:bg-gray-700 transition-colors shadow-lg flex items-center gap-2 text-sm z-10"
      >
        About
      </button>
    </div>
  );
};

export default BobaOrderApp;