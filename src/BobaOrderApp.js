import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, Clock, User, TrendingUp, Shield, Download, Eye, Lock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise use fallback values
// This allows the app to work both in development (localhost) and production
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ykwpsojpnfqwqtpxtccv.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3Bzb2pwbmZxd3F0cHh0Y2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDkxMjEsImV4cCI6MjA2OTQyNTEyMX0.fRAUneAPz1a7krlsU7le7-g4Ub0pogfyqoeNOcGw1RE';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials are missing!');
}

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
const [unpaidOrders, setUnpaidOrders] = useState([]);
const [adminTab, setAdminTab] = useState('active'); // 'active' | 'unpaid'
const [showEditModal, setShowEditModal] = useState(false);
const [orderBeingEdited, setOrderBeingEdited] = useState(null);
// Time restriction toggle - load from localStorage or default to true
const [enableOrderTimeRestriction, setEnableOrderTimeRestriction] = useState(() => {
  const saved = localStorage.getItem('enableOrderTimeRestriction');
  return saved !== null ? saved === 'true' : true;
});
const [editForm, setEditForm] = useState({
  category: '',
  flavor: '',
  teaBase: '',
  size: 'Regular',
  iceLevel: '50%',
  sugarLevel: '100%',
  toppings: [],
  crystalBoba: false,
  quantity: 1,
});

// Enhanced security state
const [loginAttempts, setLoginAttempts] = useState(0);
const [isLocked, setIsLocked] = useState(false);
const [lockoutExpiry, setLockoutExpiry] = useState(null);

// Enhanced Security Configuration
const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 3,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  SESSION_DURATION: 2 * 60 * 60 * 1000, // 2 hours
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  MAX_REQUESTS_PER_MINUTE: 5
};

// Security helper functions
// Note: loadSecurityState is kept for potential future use but currently not called
// eslint-disable-next-line no-unused-vars
const loadSecurityState = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('adminSecurity') || '{}');
    if (stored.lockoutExpiry && new Date(stored.lockoutExpiry) > new Date()) {
      setIsLocked(true);
      setLockoutExpiry(new Date(stored.lockoutExpiry));
      setLoginAttempts(stored.attempts || 0);
    } else {
      // Clear expired lockout
      localStorage.removeItem('adminSecurity');
    }
  } catch (error) {
    console.error('Error loading security state:', error);
  }
};

const saveSecurityState = (attempts, expiry = null) => {
  const securityData = {
    attempts,
    lockoutExpiry: expiry,
    timestamp: new Date().toISOString()
  };
  localStorage.setItem('adminSecurity', JSON.stringify(securityData));
};

// Removed unused admin session helpers (create/check/clear)

// Backend authentication function
const verifyAdminPassword = async (password) => {
  try {
    // Try environment variable first, fallback to hash comparison
    const envHash = process.env.REACT_APP_ADMIN_PASSWORD_HASH;
    
    if (envHash) {
      // Use environment variable hash
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex === envHash;
    } else {
      // Fallback to hardcoded hash (less secure but works without env vars)
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // hash of password
      const fallbackHash = "d633bc94bbfb8c30f53e42b6ae9e83b23df5fb945c1574391183802eedc8a7c9";
      return hashHex === fallbackHash;
    }
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

// Try Supabase RPC authentication if available
const verifyWithSupabase = async (password) => {
  try {
    const { data, error } = await supabase.rpc('verify_admin_password', {
      input_password: password
    });
    
    if (error) {
      console.log('Supabase admin auth not configured, using client-side verification');
      return null;
    }
    
    return data === true;
  } catch (error) {
    console.log('Supabase admin auth not available, using client-side verification');
    return null;
  }
};

const MINIMUM_ORDERS = 20;



  // Load orders and stats when component mounts
  useEffect(() => {
    // Daily cleanup of legacy orders before loading
    deleteLegacyOrders();
    loadOrdersFromDatabase();
    loadOrderStats();
    loadUnpaidFromDatabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run on mount

  // Check after 10 PM to archive today's unpaid orders into unpaid_orders table
  useEffect(() => {
    let isArchiving = false; // Flag to prevent concurrent archiving
    
    const checkAndArchive = async () => {
      // Prevent concurrent execution
      if (isArchiving) {
        console.log('Archival already in progress, skipping...');
        return;
      }
      
      try {
        const now = new Date();
        const archiveKey = `archive_unpaid_${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
        const archiveInProgressKey = `${archiveKey}_in_progress`;
        const tenPm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0, 0);
        
        // Check if we should archive
        if (now >= tenPm) {
          // Check if already archived
          if (localStorage.getItem(archiveKey)) {
            return; // Already archived today
          }
          
          // Check if another instance is archiving (with timestamp to handle stale locks)
          const inProgress = localStorage.getItem(archiveInProgressKey);
          if (inProgress) {
            const inProgressTime = parseInt(inProgress, 10);
            const timeSinceStart = Date.now() - inProgressTime;
            // If another instance started archiving less than 5 minutes ago, skip
            if (timeSinceStart < 5 * 60 * 1000) {
              console.log('Another instance is archiving, skipping...');
              return;
            }
            // Stale lock, clear it
            localStorage.removeItem(archiveInProgressKey);
          }
          
          // Set in-progress flag atomically
          localStorage.setItem(archiveInProgressKey, Date.now().toString());
          isArchiving = true;
          
          try {
            console.log('Running archival process...');
            await archiveTodaysUnpaidOrders();
            localStorage.setItem(archiveKey, 'done');
            console.log('Archival complete. Refreshing unpaid list...');
            // Refresh unpaid list
            await loadUnpaidFromDatabase();
          } finally {
            // Clear in-progress flag
            localStorage.removeItem(archiveInProgressKey);
            isArchiving = false;
          }
        }
      } catch (e) {
        console.error('Archival check error:', e);
        // Clear in-progress flag on error
        const now = new Date();
        const archiveInProgressKey = `archive_unpaid_${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}_in_progress`;
        localStorage.removeItem(archiveInProgressKey);
        isArchiving = false;
      }
    };
    const interval = setInterval(checkAndArchive, 60000);
    checkAndArchive();
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - functions are stable and don't need to be dependencies

  // Removed old 15-minute pending auto-delete logic

  // Removed connection test and status tracking

  // Require tea base for tea drinks
  const teaCategories = [
    'Classic Milk Tea', 'Other Tea', 'Milk Tea', 'Premium Milk Tea', 'Panda Milk Tea', 'Fruit Tea'
  ];
  const showTeaBaseOption = (category) => teaCategories.includes(category);
  const requiresTeaBase = (category) => teaCategories.includes(category);

  // Available tea bases
  const teaBases = ['Black Tea', 'Green Tea'];

  // Helpers for daily window (local time)
  const getTodayBounds = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  };

  // Removed unused isToday function

  // Display window bounds: from 8:30 AM local to 10:00 PM local today
  const getDisplayBounds = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  };

  // Load only today's orders from Supabase
  const loadOrdersFromDatabase = async () => {
    const { startIso, endIso } = getTodayBounds();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading orders:', error);
      console.error(`Database error: ${error.message}. Please check your Supabase setup.`);
      return;
    }

    // Save state and set the next counter based on sequence
    const todaysOrders = data || [];
    setAllOrders(todaysOrders);
    const maxOrderNumber = todaysOrders.reduce((max, order) => Math.max(max, order.order_number || 0), 0);
    setOrderCounter(Math.max(1, maxOrderNumber + 1));
  };

  // Load order statistics from Supabase
  const loadOrderStats = async () => {
    try {
      const { startIso, endIso } = getTodayBounds();
      const { data, error } = await supabase
        .from('orders')
        .select('quantity, price')
        .gte('created_at', startIso)
        .lt('created_at', endIso);

      if (error) {
        console.error('Error loading stats:', error);
        return;
      }

      if (data) {
        const count = data.reduce((sum, order) => sum + (order.quantity || 1), 0);
        // Calculate total value including tax (7.5%)
        const totalValue = data.reduce((sum, order) => {
          const preTaxPrice = order.price || 0;
          const withTax = Math.round(preTaxPrice * 1.075 * 100) / 100;
          return sum + withTax;
        }, 0);
        setTotalOrders({ count, totalValue });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Reassign order numbers sequentially (in-memory)
  const reassignOrderNumbers = (orders) => {
    return orders
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((order, index) => ({ ...order, order_number: index + 1 }));
  };

  // Persist resequencing for today's orders to the database to avoid gaps/skips
  const resequenceTodayOrders = async () => {
    try {
      const { startIso, endIso } = getTodayBounds();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Error fetching orders for resequencing:', error);
        return;
      }
      const current = data || [];
      const resequenced = reassignOrderNumbers(current);
      // Build updates for rows where order_number differs
      const updates = resequenced.filter((newRow, idx) => (current[idx]?.order_number || 0) !== newRow.order_number)
        .map(row => ({ id: row.id, order_number: row.order_number }));
      // Persist updates one by one to keep it simple
      for (const row of updates) {
        const { error: updErr } = await supabase
          .from('orders')
          .update({ order_number: row.order_number })
          .eq('id', row.id);
        if (updErr) {
          console.error('Error updating order_number:', updErr);
        }
      }
      setAllOrders(resequenced);
      setOrderCounter(resequenced.length + 1);
    } catch (e) {
      console.error('Unexpected resequencing error:', e);
    }
  };

  // Daily cleanup: delete legacy orders older than today to keep table clean
  const deleteLegacyOrders = async () => {
    try {
      const { startIso } = getTodayBounds();
      const { error } = await supabase
        .from('orders')
        .delete()
        .lt('created_at', startIso);
      if (error) {
        console.error('Error deleting legacy orders:', error);
      }
    } catch (e) {
      console.error('Unexpected legacy cleanup error:', e);
    }
  };

  // Load unpaid_orders table for admin unpaid tab
  const loadUnpaidFromDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('unpaid_orders')
        .select('*')
        .order('order_date', { ascending: false });
      if (error) {
        console.warn('Unpaid table not available or error loading:', error.message);
        setUnpaidOrders([]);
        return;
      }
      setUnpaidOrders(data || []);
    } catch (e) {
      console.error('Error loading unpaid orders:', e);
    }
  };

  // Delete an active order
  const deleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order: ' + error.message);
        return;
      }

      // Update local state
      setAllOrders(prev => prev.filter(o => o.id !== orderId));
      
      // Reload stats to ensure accuracy
      await loadOrderStats();
    } catch (e) {
      console.error('Error deleting order:', e);
      alert('An error occurred while deleting the order');
    }
  };

  // Delete an unpaid archived order
  const deleteUnpaidOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this unpaid order record? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('unpaid_orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        console.error('Error deleting unpaid order:', error);
        alert('Failed to delete unpaid order: ' + error.message);
        return;
      }

      // Update local state
      setUnpaidOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (e) {
      console.error('Error deleting unpaid order:', e);
      alert('An error occurred while deleting the unpaid order');
    }
  };

  // Archive today's unpaid orders (paid === false AND picked_up === true) to unpaid_orders table
  // Only archive orders that were actually picked up but not paid (meaning they were ordered/delivered)
  // Orders that are both unpaid AND not picked up are excluded (they were never actually ordered)
  const archiveTodaysUnpaidOrders = async () => {
    try {
      const { startIso, endIso } = getTodayBounds();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .eq('paid', false)
        .eq('picked_up', true); // Only archive orders that were picked up but not paid
      
      if (error) {
        console.error('Error fetching unpaid orders for archival:', error);
        return;
      }
      
      // Filter out any orders that don't meet criteria (defensive check)
      const validOrders = (data || []).filter(o => o.paid === false && o.picked_up === true);
      
      if (validOrders.length === 0) {
        console.log('No unpaid orders to archive (only archiving orders that were picked up but not paid).');
        return;
      }
      
      // Calculate total with tax for each order
      const toArchive = validOrders.map(o => {
        const preTaxAmount = o.price || 0;
        const totalWithTax = Math.round(preTaxAmount * 1.075 * 100) / 100;
        return {
          customer_name: o.customer_name,
          amount: totalWithTax, // Store the tax-inclusive amount
          order_date: o.created_at,
          details: `${o.flavor} (${o.category})${o.size ? ' - '+o.size : ''} - Qty: ${o.quantity || 1}`,
        };
      });

      // First try to delete any existing entries for today to prevent duplicates
      const { error: deleteErr } = await supabase
        .from('unpaid_orders')
        .delete()
        .gte('order_date', startIso)
        .lt('order_date', endIso);
      
      if (deleteErr) {
        console.error('Error cleaning up existing unpaid orders:', deleteErr);
        return;
      }

      // Then insert the new unpaid orders
      const { error: insertErr } = await supabase
        .from('unpaid_orders')
        .insert(toArchive);
        
      if (insertErr) {
        console.error('Error archiving unpaid orders:', insertErr);
        return;
      }
      
      console.log(`Archived ${toArchive.length} unpaid orders to unpaid_orders (orders that were picked up but not paid).`);
    } catch (e) {
      console.error('Unexpected error archiving unpaid orders:', e);
    }
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
      flavors: ['Normal']
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
    'Honey Boba', 'Crystal Boba (+30¢)', 'Popping Boba (Mango)', 'Popping Boba (Strawberry)',
    'Popping Boba (Lychee)', 'Popping Boba (Passionfruit)', 'Popping Boba (Blueberry)', 'Popping Boba (Kiwi)', 
    'Popping Boba (Peach)','Mango Stars', 'Strawberry Hearts', 'Green Apple Jelly', 'Lychee Jelly',
    'Rainbow Jelly', 'Coffee Jelly', 'Red Bean', 'Grass Jelly (+25¢)',
    'Egg Pudding (+25¢)'
  ];

  const iceLevels = ['No Ice', '25%', '50%', '75%', '100%'];
  const sugarLevels = ['0%', '30%', '50%', '70%', '100%'];


  // Toggle function for time restriction (saves to localStorage)
  const toggleOrderTimeRestriction = () => {
    const newValue = !enableOrderTimeRestriction;
    setEnableOrderTimeRestriction(newValue);
    localStorage.setItem('enableOrderTimeRestriction', newValue.toString());
    console.log(`Order time restriction ${newValue ? 'enabled' : 'disabled'}`);
  };

  // Only allow ordering during specific days/times if enabled
  const isOrderingOpen = () => {
  // If restriction is off, always allow ordering
  if (!enableOrderTimeRestriction) return true;
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    // Only allow ordering on Tuesday (2) or Wednesday (3), 8:30am-2:00pm
    if ((day === 2 || day === 3) && (hour > 8 || (hour === 8 && minute >= 30)) && hour < 14) {
      return true;
    }
    return false;
  };

  const getOrderingStatus = () => {
    // If time restriction is disabled, show that ordering is always open
    if (!enableOrderTimeRestriction) {
      return "ORDERING OPEN - Time restriction disabled by admin";
    }
    
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    if (day === 2 || day === 3) {
      if (hour < 8 || (hour === 8 && minute < 30)) {
        return "Opening at 8:30 AM";
      } else if (hour >= 14) {
        return "ORDERS CLOSED - Delivery at 4:45 PM";
      } else {
        return "COLLECTING ORDERS - Closes 2:00 PM";
      }
    }
    return "Orders open Tuesdays & Wednesdays 8:30 AM - 2:00 PM";
  };

  // Compute item pricing components consistently for breakdowns and totals
  const getItemPricingComponents = (item) => {
    const categoryInfo = drinkCategories[item.category];
    if (!categoryInfo) {
      return {
        basePrice: 0,
        sizeUpgrade: 0,
        toppingsPrice: 0,
        crystalBobaPrice: 0,
      };
    }
    const basePrice = categoryInfo.price;
    const sizeUpgrade = item.size === 'Large' ? 0.85 : 0;
    let toppingsPrice = 0;
    (item.toppings || []).forEach(topping => {
      if (topping.includes('Crystal Boba')) {
        toppingsPrice += 0.30;
      } else if (topping.includes('Grass Jelly') || topping.includes('Egg Pudding')) {
        toppingsPrice += 0.25;
      } else {
        toppingsPrice += 0.70;
      }
    });
    const crystalBobaPrice = item.crystalBoba ? 0.30 : 0;
    return { basePrice, sizeUpgrade, toppingsPrice, crystalBobaPrice };
  };

  // Calculate item price (pre-tax). 20% discount applies to drink + size + toppings.
  const calculateItemPrice = (item) => {
    const { basePrice, sizeUpgrade, toppingsPrice, crystalBobaPrice } = getItemPricingComponents(item);
    const subtotalBeforeDiscount = basePrice + sizeUpgrade + toppingsPrice + crystalBobaPrice;
    const discountedSubtotal = subtotalBeforeDiscount * 0.8;
    const subtotalPreTax = discountedSubtotal * item.quantity;
    return Math.round(subtotalPreTax * 100) / 100;
  };

  // Detailed per-item breakdown (single unit)
  const getItemBreakdown = (item) => {
    const { basePrice, sizeUpgrade, toppingsPrice, crystalBobaPrice } = getItemPricingComponents(item);
    const preDiscount = basePrice + sizeUpgrade + toppingsPrice + crystalBobaPrice;
    const discount = preDiscount * 0.2;
    const discounted = preDiscount - discount;
    const estimatedTax = discounted * 0.075;
    const itemTotal = discounted + estimatedTax;
    return {
      baseAndSize: basePrice + sizeUpgrade,
      toppingsTotal: toppingsPrice + crystalBobaPrice,
      preDiscount,
      discount,
      discounted,
      estimatedTax,
      itemTotal,
    };
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
      // Store item price pre-tax; tax added at checkout only
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

  // Cart subtotal (pre-tax). Items already include 20% discount on drink+size and full-priced toppings
  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price, 0);
  };

  const getSubtotal = () => {
    return getTotalPrice();
  };

  const getSalesTax = () => {
    return getSubtotal() * 0.075;
  };

  // Final total includes sales tax (7.5%) applied once at checkout
  const getFinalTotal = () => {
    const subtotal = getSubtotal();
    const tax = subtotal * 0.075;
    return Math.round((subtotal + tax) * 100) / 100;
  };

  const handleAdminClick = () => {
    setShowPasswordModal(true);
  };

const handlePasswordSubmit = async () => {
  // Check if locked out
  if (isLocked) {
    const remainingTime = Math.ceil((lockoutExpiry - new Date()) / 1000 / 60);
    alert(`Account is locked. Please try again in ${remainingTime} minute(s).`);
    return;
  }

  if (!passwordInput.trim()) {
    alert('Please enter a password');
    return;
  }

  setLoading(true);
  
  try {
    // Try Supabase authentication first
    let isValid = await verifyWithSupabase(passwordInput);
    
    // If Supabase auth not available, use client-side verification
    if (isValid === null) {
      isValid = await verifyAdminPassword(passwordInput);
    }
    
    if (isValid) {
      // Reset security state on successful login
      setLoginAttempts(0);
      setIsLocked(false);
      setLockoutExpiry(null);
      localStorage.removeItem('adminSecurity');
      
      // Enable admin mode after successful authentication
      setIsAdminMode(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      
      console.log('Admin authenticated successfully');
    } else {
      // Handle failed login attempt
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      if (newAttempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        const lockExpiry = new Date(Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION);
        setIsLocked(true);
        setLockoutExpiry(lockExpiry);
        saveSecurityState(newAttempts, lockExpiry.toISOString());
        alert(`Too many failed attempts. Account locked for ${SECURITY_CONFIG.LOCKOUT_DURATION / 60000} minutes.`);
      } else {
        const remainingAttempts = SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - newAttempts;
        saveSecurityState(newAttempts);
        alert(`Incorrect password. ${remainingAttempts} attempt(s) remaining before lockout.`);
      }
      
      setPasswordInput('');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    alert('Authentication system error. Please try again.');
  } finally {
    setLoading(false);
  }
};

  // Updated toggleOrderStatus function - no deletion on completion, only status updates
  const toggleOrderStatus = async (orderId, field) => {
    const order = allOrders.find(o => o.id === orderId);
    if (order) {
      const newValue = !order[field];
      
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
  };

  const getVisibleOrders = () => {
    const { startIso, endIso } = getDisplayBounds();
    return allOrders.filter(o => o.created_at >= startIso && o.created_at < endIso);
  };

  const PaymentInfo = () => {
    const paymentDetails = {
      venmo: { info: '@megcherry63', note: 'Indicate the payment is for Boba, Last 4 digits are 4363' },
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
      'Price (Before Tax)',
      'Total (With Tax)'
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

      // Calculate total with tax
      const priceWithTax = Math.round(order.price * 1.075 * 100) / 100;

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
        order.price.toFixed(2),
        priceWithTax.toFixed(2)
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

  const EditOrderModal = () => {
    if (!showEditModal || !orderBeingEdited) return null;
    const currentCategory = editForm.category;
    const availableFlavors = currentCategory ? (drinkCategories[currentCategory]?.flavors || []) : [];
    const pricePreview = calculateItemPrice(editForm);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg font-semibold text-gray-800">Edit Order #{orderBeingEdited.order_number}</h2>
            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close edit dialog">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-4 overflow-y-auto flex-1">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value, flavor: '', teaBase: teaCategories.includes(e.target.value) ? (editForm.teaBase || 'Black Tea') : '' })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option value="">Select category</option>
                  {Object.keys(drinkCategories).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {editForm.category && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Flavor</label>
                  <select
                    value={editForm.flavor}
                    onChange={(e) => setEditForm({ ...editForm, flavor: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select flavor</option>
                    {availableFlavors.map((flavor) => (
                      <option key={flavor} value={flavor}>{flavor}</option>
                    ))}
                  </select>
                </div>
              )}

              {editForm.category && showTeaBaseOption(editForm.category) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tea Base</label>
                  <select
                    value={editForm.teaBase}
                    onChange={(e) => setEditForm({ ...editForm, teaBase: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    {teaBases.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}

              {editForm.category && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                  <select
                    value={editForm.size}
                    onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Large">Large</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ice Level</label>
                <select
                  value={editForm.iceLevel}
                  onChange={(e) => setEditForm({ ...editForm, iceLevel: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  {iceLevels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sugar Level</label>
                <select
                  value={editForm.sugarLevel}
                  onChange={(e) => setEditForm({ ...editForm, sugarLevel: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  {sugarLevels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {editForm.category && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Toppings</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded">
                    {toppings.map(t => (
                      <label key={t} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.toppings.includes(t)}
                          onChange={(e) => {
                            const selected = e.target.checked
                              ? [...editForm.toppings, t]
                              : editForm.toppings.filter(x => x !== t);
                            setEditForm({ ...editForm, toppings: selected });
                          }}
                        />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-end justify-between md:col-span-2">
                <div className="text-sm text-gray-700">Per-item (pre-tax): <span className="font-semibold">${pricePreview.toFixed(2)}</span></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditForm({ ...editForm, quantity: Math.max(1, (editForm.quantity || 1) - 1) })} className="px-2 py-1 border rounded" aria-label="Decrease quantity">-</button>
                    <input type="number" min="1" value={editForm.quantity || 1} onChange={(e) => setEditForm({ ...editForm, quantity: Math.max(1, Number(e.target.value) || 1) })} className="w-16 text-center p-2 border rounded" />
                    <button onClick={() => setEditForm({ ...editForm, quantity: (editForm.quantity || 1) + 1 })} className="px-2 py-1 border rounded" aria-label="Increase quantity">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t flex gap-3 sticky bottom-0 bg-white z-10">
            <button
              onClick={async () => {
                try {
                  // Recalculate price using existing logic with possibly updated quantity
                  const quantity = Math.max(1, editForm.quantity || orderBeingEdited.quantity || 1);
                  const perItem = calculateItemPrice({ ...editForm, quantity: 1 });
                  const newPrice = perItem * quantity;
                  const updatePayload = {
                    category: editForm.category,
                    flavor: editForm.flavor,
                    tea_base: editForm.teaBase || null,
                    size: editForm.size,
                    ice_level: editForm.iceLevel,
                    sugar_level: editForm.sugarLevel,
                    toppings: editForm.toppings,
                    crystal_boba: editForm.crystalBoba || false,
                    quantity,
                    price: Math.round(newPrice * 100) / 100,
                  };
                  const { error } = await supabase
                    .from('orders')
                    .update(updatePayload)
                    .eq('id', orderBeingEdited.id);
                  if (error) {
                    alert(`Failed to update order: ${error.message}`);
                    return;
                  }
                  // Update local state
                  setAllOrders(prev => prev.map(o => o.id === orderBeingEdited.id ? { ...o, ...updatePayload } : o));
                  // Reload stats to ensure accurate count and total
                  await loadOrderStats();
                  setShowEditModal(false);
                } catch (e) {
                  console.error('Update error:', e);
                  alert('Failed to update order.');
                }
              }}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
            >
              Save Changes
            </button>
            <button onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const AdminPanel = () => {
    const visibleOrders = getVisibleOrders();
    const adminSubtotal = visibleOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const adminTax = Math.round(adminSubtotal * 0.075 * 100) / 100;
    
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-red-600">🔐 Admin Panel</h1>
            <p className="text-gray-600 mt-2">View and manage all boba orders</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={toggleOrderTimeRestriction}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                enableOrderTimeRestriction
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              title={enableOrderTimeRestriction ? 'Time restriction is ON - Click to disable' : 'Time restriction is OFF - Click to enable'}
            >
              <Clock className="w-4 h-4" />
              {enableOrderTimeRestriction ? 'Time Restriction ON' : 'Time Restriction OFF'}
            </button>
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
        <EditOrderModal />

        {/* Admin tabs */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            <button
              className={`py-2 px-1 border-b-2 text-sm font-medium ${adminTab === 'active' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setAdminTab('active')}
            >
              Active Today
            </button>
            <button
              className={`py-2 px-1 border-b-2 text-sm font-medium ${adminTab === 'unpaid' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setAdminTab('unpaid')}
            >
              Unpaid Archive
            </button>
          </nav>
        </div>

        {adminTab === 'active' && (
        <>
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
            <h3 className="text-lg font-semibold text-purple-800">Total Revenue (incl. tax)</h3>
            <p className="text-3xl font-bold text-purple-600">${totalOrders.totalValue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Today's Orders ({visibleOrders.length})
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Numbers resequenced daily; completed orders are retained)
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (w/ tax)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.price.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(Math.round(order.price * 1.075 * 100) / 100).toFixed(2)}</td>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setOrderBeingEdited(order);
                              setEditForm({
                                category: order.category || '',
                                flavor: order.flavor || '',
                                teaBase: order.tea_base || order.teaBase || '',
                                size: order.size || 'Regular',
                                iceLevel: order.ice_level || order.iceLevel || '50%',
                                sugarLevel: order.sugar_level || order.sugarLevel || '100%',
                                toppings: order.toppings || [],
                                crystalBoba: order.crystal_boba || order.crystalBoba || false,
                                quantity: order.quantity || 1,
                              });
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}

        {adminTab === 'unpaid' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Unpaid Archive ({unpaidOrders.length})
              </h2>
              <p className="text-xs text-gray-500">Orders not paid by 10:00 PM are archived here with amount and date.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unpaidOrders.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No archived unpaid orders</td>
                    </tr>
                  ) : (
                    unpaidOrders.map((row) => (
                      <tr key={`${row.id}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.customer_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.details}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${row.amount?.toFixed ? row.amount.toFixed(2) : Number(row.amount || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(row.order_date).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => deleteUnpaidOrder(row.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
              <li>Orders are only accepted during designated time periods (Tuesdays & Wednesdays 8:30 AM - 2:00 PM)</li>
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
        // Verify Supabase is properly configured
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase is not properly configured. Please check your environment variables.');
        }
        
        const timestamp = new Date().toISOString();
        
        console.log('Current cart state:', cart);
        
        console.log('Current payment method:', paymentMethod);
        
        // Retry logic for handling race conditions with duplicate order numbers
        const maxRetries = 3;
        let savedOrders = null;
        let error = null;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          // Get the current max order number RIGHT BEFORE inserting to avoid race conditions
          const { startIso, endIso } = getTodayBounds();
          
          let currentOrders = null;
          let fetchError = null;
          
          try {
            const result = await supabase
              .from('orders')
              .select('order_number')
              .gte('created_at', startIso)
              .lt('created_at', endIso)
              .order('order_number', { ascending: false })
              .limit(1);
            
            currentOrders = result.data;
            fetchError = result.error;
          } catch (err) {
            // Handle network errors or other exceptions
            console.error('Exception fetching current orders:', err);
            fetchError = err;
          }
          
          // Calculate the next order number based on the current max
          // If fetch failed, use orderCounter as fallback (from state)
          let currentMaxOrderNumber = 0;
          
          if (fetchError) {
            console.warn('Error fetching current orders, using fallback order counter:', fetchError);
            // Use the orderCounter state as a fallback if fetch fails
            // This ensures orders can still be submitted even if there's a network issue
            currentMaxOrderNumber = Math.max(0, orderCounter - 1);
          } else {
            currentMaxOrderNumber = currentOrders && currentOrders.length > 0 
              ? (currentOrders[0].order_number || 0) 
              : 0;
          }
          
          const nextOrderNumber = currentMaxOrderNumber + 1;
          
          console.log(`Attempt ${attempt + 1}: Current max order number: ${currentMaxOrderNumber}, Next order number: ${nextOrderNumber}`);
          
          // Expand cart items with quantity > 1 into separate orders, each with quantity 1
          // Each quantity gets its own order number
          const ordersToSave = [];
          let orderNumberIndex = 0;
          
          cart.forEach((item) => {
            const quantity = item.quantity || 1;
            // Recalculate per-item price using calculateItemPrice with quantity 1
            // This ensures accurate pricing without rounding errors from division
            const perItemPrice = calculateItemPrice({ ...item, quantity: 1 });
            
            // Create a separate order for each quantity
            for (let i = 0; i < quantity; i++) {
              ordersToSave.push({
                order_number: nextOrderNumber + orderNumberIndex,
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
                quantity: 1, // Each order is quantity 1
                price: perItemPrice, // Per-item pre-tax price (tax applied later when displaying/calculating totals)
                created_at: timestamp,
                picked_up: false,
                paid: false
              });
              orderNumberIndex++;
            }
          });
          
          console.log('Attempting to save orders:', ordersToSave);
          
          // Save all orders in a single batch
          let result = null;
          try {
            result = await supabase
              .from('orders')
              .insert(ordersToSave)
              .select();
            
            savedOrders = result.data;
            error = result.error;
          } catch (insertErr) {
            // Handle network errors or exceptions during insert
            console.error('Exception during insert:', insertErr);
            error = insertErr;
            savedOrders = null;
          }
          
          // If successful or not a duplicate key error, break out of retry loop
          if (!error || (error.code && error.code !== '23505')) {
            break;
          }
          
          // If it's a duplicate key error and we have retries left, wait a bit and retry
          if (error.code === '23505' && attempt < maxRetries - 1) {
            console.log(`Duplicate key error detected, retrying... (attempt ${attempt + 1}/${maxRetries})`);
            // Wait a small random amount to reduce collision probability
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
            continue;
          }
        }
          
        if (error) {
          console.error('Supabase error details:', error);
          
          // Check if it's a network/fetch error
          if (error.message && error.message.includes('Failed to fetch')) {
            throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
          }
          
          if (error.code === '23505') {
            throw new Error('Order number conflict detected. Please try submitting again.');
          }
          
          // Handle different error types
          const errorMessage = error.message || error.toString() || 'Unknown error';
          const errorCode = error.code || 'NO_CODE';
          throw new Error(`Failed to save order: ${errorMessage}${errorCode !== 'NO_CODE' ? ` (${errorCode})` : ''}`);
        }
        
        // Update UI with saved orders
        if (savedOrders && savedOrders.length > 0) {
          // Update order counts and totals
          // Reload stats to ensure accuracy
          await loadOrderStats();
          
          // Clear the cart
          setCart([]);
          
          // Reset form fields
          setCustomerName('');
          setPaymentMethod('');
          
          // Resequence today's orders to ensure continuous numbering
          await resequenceTodayOrders();
          // Reload today's orders to reflect updated sequence
          await loadOrdersFromDatabase();
          
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
                      {/* Per-item breakdown */}
                      {(() => {
                        const bd = getItemBreakdown({ ...item, quantity: 1 });
                        return (
                          <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                            <div>Base+Size: ${bd.baseAndSize.toFixed(2)}</div>
                            <div>Toppings: ${bd.toppingsTotal.toFixed(2)}</div>
                            <div>Discount (20%): -${bd.discount.toFixed(2)}</div>
                            <div>Subtotal after discount: ${bd.discounted.toFixed(2)}</div>
                            <div>Est. tax (7.5%): ${bd.estimatedTax.toFixed(2)}</div>
                            <div className="font-medium text-gray-700">Per-item total est.: ${(bd.itemTotal).toFixed(2)}</div>
                          </div>
                        );
                      })()}
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
                <span>Sales Tax (7.5%):</span>
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
                  <td className="px-4 py-2">${order.price ? (Math.round(order.price * 1.075 * 100) / 100).toFixed(2) : ''} (incl. tax)</td>
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
            disabled={cart.length === 0 || (enableOrderTimeRestriction && !isOrderingOpen())}
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
      {(!enableOrderTimeRestriction || isOrderingOpen()) ? (
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
              <span className="text-purple-700">Total Order Value (incl. tax):</span>
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
                  Toppings <span className="text-purple-600 text-xs">(20% discount applies to toppings)</span>
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
          <div className="text-gray-700 text-center mb-6">Please check back during the designated ordering period.<br/>Orders are open Tuesdays & Wednesdays 8:30 AM - 2:00 PM.</div>
          <div className="text-2xl font-bold text-blue-600 mb-4">Payment Information:</div>
          <div className="text-gray-700 text-center mb-6">Venmo handle: @megcherry63<br/>Last 4 digits: 4363<br/>If paying Zelle, ask for info during pickup.</div>
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