import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, Clock, User, TrendingUp, Shield, Download, Eye, Lock } from 'lucide-react';

// Mock Supabase for demo - replace with your actual Supabase client
const supabase = {
  from: (table) => ({
    select: (columns) => ({
      order: (column, options) => ({
        then: (callback) => {
          // Mock data for demo
          const mockOrders = [];
          callback({ data: mockOrders, error: null });
        }
      })
    }),
    insert: (data) => ({
      select: () => ({
        then: (callback) => {
          const insertedData = data.map((item, index) => ({ ...item, id: Date.now() + index }));
          callback({ data: insertedData, error: null });
        }
      })
    }),
    update: (data) => ({
      eq: (column, value) => ({
        then: (callback) => {
          callback({ error: null });
        }
      })
    }),
    delete: () => ({
      eq: (column, value) => ({
        then: (callback) => {
          callback({ error: null });
        }
      })
    })
  })
};

const BobaOrderApp = () => {
  const [cart, setCart] = useState([]);
  const [currentOrder, setCurrentOrder] = useState({
    category: '',
    flavor: '',
    teaBase: '', // New field for tea base
    size: 'Regular',
    iceLevel: '50%',
    sugarLevel: '50%',
    toppings: [],
    crystalBoba: false,
    quantity: 1
  });
  const [paymentMethod, setPaymentMethod] = useState('venmo');
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
  
  const ADMIN_PASSWORD = "bobaadmin123";
  const MINIMUM_ORDERS = 20;

  // Load orders and stats when component mounts
  useEffect(() => {
    loadOrdersFromDatabase();
    loadOrderStats();
  }, []);

  // Tea base is optional for all drinks
  const showTeaBaseOption = (category) => {
    return category !== ''; // Show for any selected category
  };

  // Helper function to check if tea base is required (not used but keeping for consistency)
  const requiresTeaBase = (category) => {
    return false; // Tea base is optional for all drinks
  };

  // Available tea bases
  const teaBases = ['Black Tea', 'Green Tea'];

  // Load all orders from Supabase
  const loadOrdersFromDatabase = async () => {
    try {
      console.log('Loading orders from Supabase...');
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Error loading orders:', error);
        alert(`Database error: ${error.message}. Please check your Supabase setup.`);
        return;
      }

      // Reassign order numbers sequentially
      const ordersWithSequentialNumbers = (data || []).map((order, index) => ({
        ...order,
        order_number: index + 1
      }));

      setAllOrders(ordersWithSequentialNumbers);
      
      // Set next order counter
      setOrderCounter((ordersWithSequentialNumbers.length || 0) + 1);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert(`Connection error: ${error.message}. Please check your internet connection and Supabase configuration.`);
    }
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

  // Save order to Supabase
  const saveOrderToDatabase = async (orderData) => {
    try {
      console.log('Attempting to save order:', orderData);
      
      const orderToInsert = {
        order_number: orderData.orderNumber,
        customer_name: orderData.customerName || 'Pending',
        category: orderData.category,
        flavor: orderData.flavor,
        tea_base: orderData.teaBase || null, // New field
        size: orderData.size,
        ice_level: orderData.iceLevel,
        sugar_level: orderData.sugarLevel,
        toppings: orderData.toppings,
        crystal_boba: orderData.crystalBoba,
        quantity: orderData.quantity,
        price: orderData.price,
        payment_method: orderData.paymentMethod || 'Not Selected'
      };

      console.log('Data to insert:', orderToInsert);

      const { data, error } = await supabase
        .from('orders')
        .insert([orderToInsert])
        .select();

      console.log('Supabase insert response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        alert(`Failed to save order: ${error.message}`);
        return null;
      }

      console.log('Order saved successfully:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Caught error while saving:', error);
      alert(`Something went wrong: ${error.message}`);
      return null;
    }
  };

  // Update order in Supabase
  const updateOrderInDatabase = async (orderId, updates) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order:', error);
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  // Your existing drink categories and other constants remain the same
  const drinkCategories = {
    'Classic Milk Tea': {
      price: 3.49,
      flavors: ['Classic', 'Jasmine']
    },
    'Other Tea': {
      price: 3.35,
      flavors: ['Classic Tea', 'Jasmine Tea']
    },
    'Milk Tea': {
      price: 3.95,
      flavors: [
        'Almond', 'Banana', 'Blueberry', 'Blue Raspberry', 'Cantaloupe', 'Chocolate', 'Chocolate-Covered Strawberries',
        'Coconut', 'Gingerbread', 'Ginger', 'Grapefruit', 'Green Apple', 'Hazelnut', 'Honey Dew', 'Honey',
        'Lychee', 'Mango', 'Maple', 'Matcha', 'Passion Fruit', 'Peach', 'Peppermint', 'Raspberry',
        'Red Bean', 'Rose', 'Strawberry', 'Taro', 'Thai', 'Tiger', 'Tiramisu', 'Vanilla', 'Watermelon', 'Yin & Yang'
      ]
    },
    'Premium Milk Tea': {
      price: 4.05,
      flavors: ['Hokkaido (Caramel w/Classic)', 'Okinawa (Brown Sugar w/Classic']
    },
    'Panda Milk Tea': {
      price: 3.75,
      flavors: ['Panda Special']
    },
    'Fruit Tea': {
      price: 3.75,
      flavors: [
        'Almond', 'Banana', 'Blueberry', 'Cantaloupe', 'Champagne Grape',
        'Ginger', 'Green Apple', 'Honey Dew', 'Honey', 'Honey Lemon', 'Kiwi',
        'Lemon', 'Lychee', 'Mango', 'Orange', 'Passion Fruit', 'Peach',
        'Pineapple', 'Raspberry', 'Sour Plum', 'Strawberry', 'Strawberry-Mango Mix'
      ]
    },
    'Coffee': {
      price: 4.35,
      flavors: [
        'Iced Caramel Latte', 'Iced Mocha', 'Vietnamese Coffee'
      ]
    },
    'Slush': {
      price: 4.85,
      flavors: [
        'Blueberry', 'Cantaloupe', 'Champagne Grape', 'Green Apple', 'Honey Dew',
        'Honey', 'Kiwi', 'Lemon', 'Lychee', 'Mango', 'Matcha', 'Orange',
        'Passion Fruit', 'Peach', 'Peppermint', 'Pineapple', 'Red Bean',
        'Sour Plum', 'Strawberry'
      ]
    },
    'Snow': {
      price: 4.95,
      flavors: [
        'Almond', 'Cantaloupe', 'Caramel', 'Chocolate', 'Coconut', 'Green Apple',
        'Honey Dew', 'Kiwi', 'Lychee', 'Mango', 'Orange', 'Passion Fruit',
        'Peach', 'Peppermint', 'Pineapple', 'Sour Plum', 'Strawberry', 'Taro'
      ]
    },
    'Coffee Snow': {
      price: 5.35,
      flavors: [
        'Mocha Snow', 'Aloha Mocha Snow'
      ]
    },
    'Oreo Snow': {
      price: 5.25,
      flavors: [
        'Normal'
      ]
    },
    'Café au Lait (Iced)': {
      price: 3.95,
      flavors: [
        'Normal'
      ]
    },
    'Coffee Slush': {
      price: 4.05,
      flavors: [
        'Normal'
      ]
    },
    'Iced Latte': {
      price: 4.25,
      flavors: [
        'Normal'
      ]
    },
  };

  const toppings = [
    'Honey Boba', 'Crystal Boba (+30¢)', 'Popping Boba (Mango)', 'Popping Boba (Strawberry)',
    'Popping Boba (Lychee)', 'Popping Boba (Passionfruit)', 'Popping Boba (Blueberry)', 'Popping Boba (Kiwi)', 
    'Popping Boba (Peach)','Mango Stars', 'Strawberry Hearts', 'Green Apple Jelly', 'Lychee Jelly',
    'Rainbow Jelly', 'Coffee Jelly', 'Red Bean', 'Grass Jelly (+25¢)',
    'Egg Pudding (+25¢)'
  ];

  const iceLevels = ['No Ice', '25%', '50%', '75%', '100%'];
  const sugarLevels = ['0%', '30%', '50%', '70%', '100%'];

  // Your existing helper functions remain the same
  const isOrderingOpen = () => {
    return true;
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

  const calculateItemPrice = (item) => {
    const categoryInfo = drinkCategories[item.category];
    if (!categoryInfo) return 0;
    
    let basePrice = categoryInfo.price;
    
    let toppingsPrice = 0;
    item.toppings.forEach(topping => {
      if (topping.includes('+30¢') || topping === 'Crystal Boba (+30¢)') {
        toppingsPrice += 0.30;
      } else if (topping.includes('+25¢')) {
        toppingsPrice += 0.25;
      } else {
        toppingsPrice += 0.60;
      }
    });
    
    const crystalBobaPrice = item.crystalBoba ? 0.30 : 0;
    const sizeUpgrade = item.size === 'Large' ? 0.75 : 0;
    
    const subtotal = (basePrice + toppingsPrice + crystalBobaPrice + sizeUpgrade) * item.quantity;
    
    return subtotal * 0.8;
  };

  // Updated addToCart function
  const addToCart = async () => {
    if (!currentOrder.category || !currentOrder.flavor) {
      alert('Please select a drink category and flavor');
      return;
    }
    
    setLoading(true);
    
    const orderWithId = {
      ...currentOrder,
      id: Date.now(),
      price: calculateItemPrice(currentOrder),
      orderNumber: orderCounter,
      customerName: 'Pending',
      paymentMethod: 'Not Selected',
      timestamp: new Date().toISOString(),
      paid: false,
      pickedUp: false
    };
    
    // Save to database first
    const savedOrder = await saveOrderToDatabase(orderWithId);
    
    if (savedOrder) {
      // Update local state
      setCart([...cart, { ...orderWithId, id: savedOrder.id }]);
      setAllOrders(prev => [savedOrder, ...prev]);
      
      // Update stats
      setTotalOrders(prev => ({
        count: prev.count + currentOrder.quantity,
        totalValue: prev.totalValue + orderWithId.price
      }));
      
      setOrderCounter(prev => prev + 1);
      
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
    }
    
    setLoading(false);
  };

  // Updated removeFromCart function
  const removeFromCart = async (id) => {
    const itemToRemove = cart.find(item => item.id === id);
    if (itemToRemove) {
      // Remove from database
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (!error) {
        // Update local state
        setTotalOrders(prev => ({
          count: prev.count - itemToRemove.quantity,
          totalValue: Math.max(0, prev.totalValue - itemToRemove.price)
        }));
        
        // Remove from all orders and reassign numbers
        const updatedOrders = allOrders.filter(order => order.id !== id);
        const reorderedOrders = reassignOrderNumbers(updatedOrders);
        setAllOrders(reorderedOrders);
        
        setCart(cart.filter(item => item.id !== id));
        
        // Update order counter
        setOrderCounter(reorderedOrders.length + 1);
      } else {
        console.error('Error removing order:', error);
        alert(`Failed to remove order: ${error.message}`);
      }
    }
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

  const getFinalTotal = () => {
    return Math.floor((getSubtotal() + getSalesTax()) * 100) / 100;
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
        // Just update the field in database
        await updateOrderInDatabase(orderId, { [field]: newValue });
        
        // Update local state
        setAllOrders(prev => 
          prev.map(order => 
            order.id === orderId 
              ? { ...order, [field]: newValue }
              : order
          )
        );
      }
    }
  };

  const getVisibleOrders = () => {
    // Since completed orders are now deleted, just return all orders
    return allOrders;
  };

  const PaymentInfo = () => {
    const paymentDetails = {
      venmo: { info: 'Pay via Venmo', note: 'Indicate the payment is for Boba' },
      zelle: { info: 'Pay via Zelle', note: 'Include the payment is for Boba' },
      cash: { info: 'Pay with cash upon pickup', note: 'Keep in mind we have limited change and may not be able to compensate fully' }
    };

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
                          order.payment_method === 'cash' ? 'bg-yellow-100 text-yellow-800' :
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

  if (isAdminMode) {
    return <AdminPanel />;
  }

  if (showCheckout) {
    const orderNumber = cart[0]?.orderNumber || orderCounter;
    
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-purple-600">🧋 Boba Club Checkout</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Delivery ETA: 4:45 PM</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Order #{orderNumber}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCheckout(false)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method *
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="venmo">Venmo (TBD)</option>
            <option value="zelle">Zelle (TBD)</option>
            <option value="cash">Cash (pay upon pickup)</option>
          </select>
          <div className="mt-2">
            <PaymentInfo />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Summary ({cart.length} items)</h2>
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-start py-3 border-b border-gray-100">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.flavor}</h3>
                  <p className="text-sm text-gray-600">{item.category}</p>
                  {item.teaBase && (
                    <p className="text-sm text-blue-600">Tea Base: {item.teaBase}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {item.size} | Ice: {item.iceLevel} | Sugar: {item.sugarLevel}
                  </p>
                  {(item.toppings.length > 0 || item.crystalBoba) && (
                    <p className="text-sm text-gray-500">
                      Add-ons: {[
                        ...item.toppings,
                        ...(item.crystalBoba ? ['Crystal Boba'] : [])
                      ].join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">${item.price.toFixed(2)}</span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal (with 20% discount):</span>
              <span>${getSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Sales Tax (7.5%):</span>
              <span>${getSalesTax().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 text-xl font-bold border-t">
              <span>Total:</span>
              <span className="text-purple-600">${getFinalTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            if (!customerName.trim()) {
              alert('Please enter your name');
              return;
            }
            
            setLoading(true);
            
            // Update all cart orders with customer info in database
            const updatePromises = cart.map(cartItem => 
              updateOrderInDatabase(cartItem.id, {
                customer_name: customerName,
                payment_method: paymentMethod
              })
            );
            
            await Promise.all(updatePromises);
            
            // Update local state
            const updatedOrders = allOrders.map(order => 
              cart.some(cartItem => cartItem.id === order.id) 
                ? { ...order, customer_name: customerName, payment_method: paymentMethod }
                : order
            );
            setAllOrders(updatedOrders);
            
            alert(`Order confirmed for ${customerName}!\n\nOrder #${orderNumber}\nTotal: ${getFinalTotal().toFixed(2)}\nPayment: ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}\n\nDelivery ETA: 4:45 PM\n\nThanks for ordering with Boba Club!`);
            setCart([]);
            setCustomerName('');
            setShowCheckout(false);
            setLoading(false);
          }}
          disabled={cart.length === 0 || !customerName.trim() || loading}
          className="w-full bg-purple-600 text-white py-4 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : `Confirm Order - ${getFinalTotal().toFixed(2)}`}
        </button>
        
        <p className="text-center text-sm text-gray-500 mt-4">
          Thanks for ordering with Boba Club! 🧋
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white min-h-screen">
      {showPasswordModal && <PasswordModal />}
      
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
          <button
            onClick={handleAdminClick}
            className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            <Shield className="w-4 h-4" />
            Admin
          </button>
          <button
            onClick={() => setShowCheckout(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            disabled={cart.length === 0}
          >
            <ShoppingCart className="w-4 h-4" />
            Cart ({cart.length})
          </button>
        </div>
      </div>

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

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category * <span className="text-purple-600 text-xs">(All prices include 20% discount)</span>
          </label>
          <select
            value={currentOrder.category}
            onChange={(e) => setCurrentOrder({ ...currentOrder, category: e.target.value, flavor: '', teaBase: '' })}
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
              Tea Base <span className="text-gray-500 text-xs">(Optional - Select if Applicable)</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setCurrentOrder({ ...currentOrder, teaBase: '' })}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  currentOrder.teaBase === ''
                    ? 'border-gray-500 bg-gray-50 text-gray-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">N/A</div>
              </button>
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
                    {size === 'Large' ? '+$0.60 (with discount)' : 'Standard'}
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
    </div>
  );
};

export default BobaOrderApp;