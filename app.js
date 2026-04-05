// Initialize Lucide Icons
lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    const ALL_DRAWER_IDS = [
        'inbox-drawer',
        'wallet-drawer',
        'topup-drawer',
        'fiat-topup-drawer',
        'verify-drawer',
        'transfer-drawer',
        'convert-drawer',
        'manage-addresses-drawer',
        'manage-bank-accounts-drawer'
    ];

    // Nav Items Selection
    const navItems = document.querySelectorAll('.nav-item:not(.has-submenu), .nav-subitem');
    const pageTitle = document.getElementById('page-title');
    const contentBody = document.getElementById('content-body');
    
    // Submenu Toggles
    const sidebarNav = document.querySelector('.sidebar-nav');
    const submenuToggles = document.querySelectorAll('.submenu-toggle');
    submenuToggles.forEach(toggle => {
        const navGroup = toggle.closest('.nav-group');
        if (navGroup) {
            toggle.setAttribute('aria-expanded', navGroup.classList.contains('expanded') ? 'true' : 'false');
        }
    });

    sidebarNav?.addEventListener('click', (e) => {
        const toggle = e.target.closest('.submenu-toggle');
        if (!toggle) return;

        e.preventDefault();
        e.stopPropagation();

        const navGroup = toggle.closest('.nav-group');
        if (!navGroup) return;

        navGroup.classList.toggle('expanded');
        toggle.setAttribute('aria-expanded', navGroup.classList.contains('expanded') ? 'true' : 'false');
    });
    
    // Handle Navigation Selection
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active to clicked item
            item.classList.add('active');
            
            // Update the page title safely (grabbing text Content only from span if it exists, otherwise the element itself)
            const spanText = item.querySelector('span');
            const targetTitle = spanText ? spanText.textContent : item.textContent.trim();
            pageTitle.textContent = targetTitle;
            
            // Render a simulated page layout structure depending on the tab clicked
            // To simulate basic SPA behavior
            renderPlaceholderContent(targetTitle);
        });
    });

    // Header Actions Logic
    const profileToggle = document.getElementById('profile-dropdown-toggle');
    const profileMenu = document.getElementById('profile-menu');
    const langToggle = document.getElementById('lang-dropdown-toggle');
    const langMenu = document.getElementById('lang-menu');
    
    function toggleMenu(menu) {
        if (menu.classList.contains('show')) {
            menu.classList.remove('show');
        } else {
            profileMenu.classList.remove('show');
            langMenu.classList.remove('show');
            menu.classList.add('show');
        }
    }
    
    profileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(profileMenu);
    });
    
    langToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(langMenu);
    });
    
    document.addEventListener('click', () => {
        if(profileMenu) profileMenu.classList.remove('show');
        if(langMenu) langMenu.classList.remove('show');
    });

    profileMenu.addEventListener('click', (e) => e.stopPropagation());
    langMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.classList.contains('dropdown-item')) {
            langMenu.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('active'));
            e.target.classList.add('active');
            let code = "EN";
            if(e.target.textContent.includes('简')) code = "简";
            if(e.target.textContent.includes('繁')) code = "繁";
            langToggle.querySelector('span').textContent = code;
            langMenu.classList.remove('show');
        }
    });

    // Inbox Drawer Logic
    const inboxToggle = document.getElementById('inbox-toggle');
    const closeInboxBtn = document.getElementById('close-inbox-btn');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const inboxMessageList = document.getElementById('inbox-message-list');
    const pushNotification = document.getElementById('push-notification');
    const pushNotificationTitle = document.getElementById('push-notification-title');
    const pushNotificationPreview = document.getElementById('push-notification-preview');
    const pushNotificationAction = document.getElementById('push-notification-action');
    const closePushNotificationBtn = document.getElementById('close-push-notification');
    let pushNotificationTimer = null;
    let pushNotificationActionHandler = null;
    
    function openInbox() {
        document.getElementById('inbox-drawer').classList.add('drawer-active');
        document.body.classList.add('drawer-open');
        inboxToggle.classList.remove('has-new'); // clear red dot on bell when checked
    }

    function hidePushNotification() {
        pushNotification.classList.remove('show');
        if (pushNotificationTimer) {
            clearTimeout(pushNotificationTimer);
            pushNotificationTimer = null;
        }
    }

    function showPushNotification(title, preview, actionLabel, actionHandler) {
        pushNotificationTitle.textContent = title;
        pushNotificationPreview.textContent = preview;
        pushNotificationAction.textContent = actionLabel || 'View Inbox';
        pushNotificationActionHandler = actionHandler || (() => openInbox());
        pushNotification.classList.add('show');
        if (pushNotificationTimer) clearTimeout(pushNotificationTimer);
        pushNotificationTimer = setTimeout(() => {
            hidePushNotification();
        }, 5000);
    }

    function addInboxMessage(title, preview, actionLabel, actionHandler) {
        const messageHtml = `
            <div class="inbox-msg unread">
                <div class="msg-indicator"></div>
                <div class="msg-content">
                    <div class="msg-title-row">
                        <div class="msg-title">${title}</div>
                        <span class="badge-unread">未读</span>
                    </div>
                    <p class="msg-preview">${preview}</p>
                    <span class="msg-time">Just now</span>
                </div>
            </div>`;
        inboxMessageList.insertAdjacentHTML('afterbegin', messageHtml);
        inboxToggle.classList.add('has-new');
        showPushNotification(title, preview, actionLabel, actionHandler);
    }

    function notifyOrderCreated(title, preview, actionLabel, actionHandler) {
        addInboxMessage(title, preview, actionLabel, actionHandler);
        lucide.createIcons();
    }
    
    function closeAllDrawers() {
        document.body.classList.remove('drawer-open');
        ALL_DRAWER_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('drawer-active');
        });
    }
    
    // Simulate initial unread state
    inboxToggle.classList.add('has-new');
    
    inboxToggle.addEventListener('click', openInbox);
    closeInboxBtn.addEventListener('click', closeAllDrawers);
    drawerOverlay.addEventListener('click', closeAllDrawers);
    closePushNotificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hidePushNotification();
    });
    pushNotificationAction.addEventListener('click', (e) => {
        e.stopPropagation();
        hidePushNotification();
        if (pushNotificationActionHandler) pushNotificationActionHandler();
    });
    pushNotification.addEventListener('click', () => {
        hidePushNotification();
        openInbox();
    });
    
    // Wallet Drawer Specific Helper
    window.openWalletDrawer = function(address, type) {
        // Hide inbox if open
        const inboxD = document.getElementById('inbox-drawer');
        if(inboxD) inboxD.classList.remove('drawer-active');
        
        document.getElementById('wallet-drawer-address').textContent = address;
        document.getElementById('wallet-drawer-type').textContent = type + ' Wallet';
        document.getElementById('wallet-drawer').classList.add('drawer-active');
        document.body.classList.add('drawer-open');
    };
    document.getElementById('close-wallet-btn').addEventListener('click', closeAllDrawers);
    document.getElementById('close-topup-btn').addEventListener('click', closeAllDrawers);

    // Top Up Drawer
    const TOPUP_ADDRESSES = {
        USDT: { TRON: 'TQrY5xMKMc2NnLgwSgFRqrRBJBEJBKQ1CZ', ETH: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
        USDC: { TRON: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',  ETH: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }
    };
    let _topupCoin = 'USDT';

    function updateTopUpDrawer() {
        const chain = document.getElementById('topup-chain-select').value;
        const addr  = TOPUP_ADDRESSES[_topupCoin][chain];
        const label = chain === 'TRON' ? 'TRON (TRC-20)' : 'Ethereum (ERC-20)';
        document.getElementById('topup-address').textContent = addr;
        document.getElementById('topup-qr-img').src =
            'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(addr);
        document.getElementById('topup-hint').textContent =
            'This QR code and address accept ' + _topupCoin + ' deposits on the ' + label +
            ' network only. Sending other assets or using a different network may result in permanent loss of funds.';
    }

    window.openTopUpDrawer = function(coin) {
        _topupCoin = coin;
        document.getElementById('topup-drawer-title').textContent = 'Top Up ' + coin;
        document.getElementById('topup-chain-select').value = 'TRON';
        ['inbox-drawer','wallet-drawer'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('drawer-active');
        });
        updateTopUpDrawer();
        lucide.createIcons();
        document.getElementById('topup-drawer').classList.add('drawer-active');
        document.body.classList.add('drawer-open');
    };

    document.getElementById('topup-chain-select').addEventListener('change', updateTopUpDrawer);

    window.copyTopUpAddress = function() {
        const addr = document.getElementById('topup-address').textContent;
        navigator.clipboard.writeText(addr).then(() => {
            const btn = document.getElementById('topup-copy-btn');
            btn.innerHTML = '<i data-lucide="check" style="width:16px;height:16px;color:#10B981;"></i>';
            lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = '<i data-lucide="copy" style="width:16px;height:16px;"></i>';
                lucide.createIcons();
            }, 2000);
        });
    };

    window.closeAllDrawers = closeAllDrawers;

    // Bind ALL drawer close (X) buttons in one place
    [
        'close-inbox-btn',
        'close-wallet-btn',
        'close-topup-btn',
        'close-fiat-topup-btn',
        'close-verify-btn',
        'close-transfer-btn',
        'close-convert-btn',
        'close-addr-btn',
        'close-bank-accounts-btn'
    ].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', window.closeAllDrawers);
    });

    // --- Notify Wallet Owner Inline Panel ---
    window.toggleNotifyPanel = function(btn) {
        const panel = btn.parentElement.nextElementSibling;
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    };

    window.sendNotifyEmail = function(btn) {
        const input = btn.previousElementSibling;
        if (!input.value) {
            alert('Please enter an email address.');
            return;
        }
        alert('Notification email sent to ' + input.value);
        input.value = '';
        btn.parentElement.parentElement.style.display = 'none';
    };

    // --- Wallet Verification Drawer Logic ---
    window.openVerifyDrawer = function() {
        ALL_DRAWER_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('drawer-active');
        });
        
        // Reset to Step 1
        document.getElementById('verify-step-1').style.display = 'flex';
        document.getElementById('verify-step-2').style.display = 'none';
        
        // Reset forms
        document.getElementById('form-individual').style.display = 'flex';
        document.getElementById('form-organization').style.display = 'none';
        document.querySelector('input[name="ownerType"][value="individual"]').checked = true;
        document.querySelector('input[name="walletMethod"][value="metamask"]').checked = true;
        document.getElementById('verify-custodial-input').style.display = 'none';
        
        lucide.createIcons();
        document.getElementById('verify-drawer').classList.add('drawer-active');
        document.body.classList.add('drawer-open');
    };


    window.toggleOwnerType = function(type) {
        if (type === 'individual') {
            document.getElementById('form-individual').style.display = 'flex';
            document.getElementById('form-organization').style.display = 'none';
        } else {
            document.getElementById('form-individual').style.display = 'none';
            document.getElementById('form-organization').style.display = 'flex';
        }
    };

    window.selectWalletMethod = function(method) {
        if (method === 'custodial') {
            document.getElementById('verify-custodial-input').style.display = 'block';
        } else {
            document.getElementById('verify-custodial-input').style.display = 'none';
        }
    };

    window.goToVerifyStep2 = function() {
        // Collect Data
        const isIndividual = document.querySelector('input[name="ownerType"][value="individual"]').checked;
        const method = document.querySelector('input[name="walletMethod"]:checked').value;
        
        let name = '';
        let details = '';
        
        if (isIndividual) {
            const fname = document.getElementById('v-fname').value || 'John';
            const mname = document.getElementById('v-mname').value || '';
            const lname = document.getElementById('v-lname').value || 'Doe';
            const addr = document.getElementById('v-iaddr').value || '123 Main St';
            name = (fname + ' ' + mname + ' ' + lname).trim();
            details = addr;
        } else {
            name = document.getElementById('v-orgname').value || 'Example Corp';
            details = document.getElementById('v-orgaddr').value || '456 Business Rd';
        }
        
        let wallet = '';
        if (method === 'custodial') {
            wallet = document.getElementById('v-wallet-addr').value || '0x...';
            document.getElementById('s2-wallet-badge').style.display = 'none';
        } else {
            // Mock wallet address generated from extension
            wallet = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
            document.getElementById('s2-wallet-badge').style.display = 'flex';
        }
        
        // Map to Step 2 Summary
        document.getElementById('s2-name').textContent = name;
        document.getElementById('s2-details').textContent = details;
        document.getElementById('s2-wallet').textContent = wallet;
        
        // Transition UI
        document.getElementById('verify-step-1').style.display = 'none';
        document.getElementById('verify-step-2').style.display = 'flex';
        lucide.createIcons();
    };

    window.confirmVerification = function() {
        alert('Verification submitted successfully.');
        closeAllDrawers();
    };

    // --- Transfer Assets Drawer Logic ---
    const TRANSFER_BALANCES = {
        USDT: 14000000.00,
        USDC: 10050000.00,
        USD: 1500000.00,
        HKD: 8200000.00,
        EUR: 320000.00,
        BRL: 980000.00
    };

    window.updateTransferAvailables = function() {
        const coin = document.getElementById('t-coin').value;
        document.getElementById('t-coin-label').textContent = coin;
        document.getElementById('t-avail').textContent = TRANSFER_BALANCES[coin].toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        checkTransferAmount(); // re-verify on coin change if amount exists
    };

    function checkTransferAmount() {
        const coin = document.getElementById('t-coin').value;
        const val = parseFloat(document.getElementById('t-amount').value) || 0;
        const avail = TRANSFER_BALANCES[coin];
        
        if (val > avail) {
            document.getElementById('t-error').style.display = 'block';
            return false;
        } else {
            document.getElementById('t-error').style.display = 'none';
            return true;
        }
    }

    document.getElementById('t-amount').addEventListener('input', checkTransferAmount);

    window.openTransferDrawer = function(coin) {
        // Hide other drawers
        ALL_DRAWER_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('drawer-active');
        });
        
        // Reset to Step 1
        window.resetTransferDrawer();
        
        // Set Data
        document.getElementById('t-coin').value = coin;
        window.updateTransferAvailables();
        document.getElementById('t-amount').value = '';
        document.getElementById('t-error').style.display = 'none';

        // Show Drawer
        lucide.createIcons();
        document.getElementById('transfer-drawer').classList.add('drawer-active');
        document.body.classList.add('drawer-open');
    };


    window.goToTransferStep2 = function() {
        const coin = document.getElementById('t-coin').value;
        const amtStr = document.getElementById('t-amount').value;
        const amt = parseFloat(amtStr) || 0;
        
        if (amt <= 0) {
            alert("Please enter a valid amount.");
            return;
        }
        
        if (!checkTransferAmount()) {
            return; // blocked by error
        }
        
        const walletRaw = document.getElementById('t-wallet').value;
        const parts = walletRaw.split('|'); // e.g. Name|Chain|Address
        
        // Map to Step 2
        document.getElementById('ts2-amount').textContent = amt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('ts2-coin').textContent = coin;
        document.getElementById('ts2-name').textContent = parts[0] || '-';
        document.getElementById('ts2-net').textContent = parts[1] || '-';
        document.getElementById('ts2-addr').textContent = parts[2] || '-';

        // Transition UI
        document.getElementById('transfer-step-1').style.display = 'none';
        document.getElementById('transfer-step-2').style.display = 'flex';
    };

    window.resetTransferDrawer = function() {
        document.getElementById('transfer-step-1').style.display = 'flex';
        document.getElementById('transfer-step-2').style.display = 'none';
    };

    window.executeTransfer = function() {
        const coin = document.getElementById('t-coin').value;
        const amt = parseFloat(document.getElementById('t-amount').value) || 0;
        const walletRaw = document.getElementById('t-wallet').value;
        const walletName = walletRaw.split('|')[0] || 'Destination wallet';
        notifyOrderCreated(
            'Transfer Order Created',
            `${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${coin} transfer to ${walletName} has been created.`,
            'View Inbox',
            () => openInbox()
        );
        alert('Transfer executed successfully.');
        closeAllDrawers();
    };

    // --- Convert Assets Drawer Logic ---
    const MOCK_EXCHANGE_RATES = {
        'USDT': { 'USD': 1.00, 'USDC': 0.9998, 'HKD': 7.82, 'EUR': 0.92, 'BRL': 5.01 },
        'USDC': { 'USD': 1.00, 'USDT': 1.0002, 'HKD': 7.82, 'EUR': 0.92, 'BRL': 5.01 },
        'USD': { 'USDT': 1.0000, 'USDC': 1.0000, 'HKD': 7.82, 'EUR': 0.92, 'BRL': 5.01 },
        'HKD': { 'USD': 0.1279, 'USDT': 0.1279, 'USDC': 0.1278, 'EUR': 0.1176, 'BRL': 0.6407 },
        'EUR': { 'USD': 1.0870, 'USDT': 1.0870, 'USDC': 1.0868, 'HKD': 8.50, 'BRL': 5.45 },
        'BRL': { 'USD': 0.1996, 'USDT': 0.1996, 'USDC': 0.1995, 'HKD': 1.56, 'EUR': 0.1835 }
    };

    let currentConvRate = 1;

    window.updateConvertQuote = function() {
        const sourceCoin = document.getElementById('cv-source-coin').textContent;
        const targetCoin = document.getElementById('cv-target-coin').value;
        const amtStr = document.getElementById('cv-amount').value;
        const amt = parseFloat(amtStr) || 0;
        
        let rate = 1;
        if (MOCK_EXCHANGE_RATES[sourceCoin] && MOCK_EXCHANGE_RATES[sourceCoin][targetCoin]) {
            rate = MOCK_EXCHANGE_RATES[sourceCoin][targetCoin];
        }
        
        // Block picking same coin ideally, but keep it simple
        if (sourceCoin === targetCoin) rate = 1;
        currentConvRate = rate;
        
        const estAmt = amt * rate;
        
        document.getElementById('cv-target-amount').textContent = estAmt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('cv-rate-text').textContent = `1 ${sourceCoin} = ${rate} ${targetCoin}`;
        
        // Error validation
        const avail = TRANSFER_BALANCES[sourceCoin] || 0;
        if (amt > avail) {
            document.getElementById('cv-error').style.display = 'block';
            return false;
        } else {
            document.getElementById('cv-error').style.display = 'none';
            return true;
        }
    };

    document.getElementById('cv-amount').addEventListener('input', window.updateConvertQuote);
    document.getElementById('cv-target-coin').addEventListener('change', window.updateConvertQuote);

    window.openConvertDrawer = function(coin) {
        ALL_DRAWER_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('drawer-active');
        });
        
        window.resetConvertDrawer();
        
        document.getElementById('cv-source-coin').textContent = coin;
        document.getElementById('cv-amount').value = '';
        const defaultTargets = {
            USDT: 'USDC',
            USDC: 'USDT',
            USD: 'USDT',
            HKD: 'USDT',
            EUR: 'USDT',
            BRL: 'USDT'
        };
        document.getElementById('cv-target-coin').value = defaultTargets[coin] || 'USDT';
        document.getElementById('cv-error').style.display = 'none';
        
        const avail = TRANSFER_BALANCES[coin] || 0;
        document.getElementById('cv-avail').textContent = avail.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        
        window.updateConvertQuote();

        lucide.createIcons();
        document.getElementById('convert-drawer').classList.add('drawer-active');
        document.body.classList.add('drawer-open');
    };


    window.goToConvertStep2 = function() {
        const sourceCoin = document.getElementById('cv-source-coin').textContent;
        const amtStr = document.getElementById('cv-amount').value;
        const amt = parseFloat(amtStr) || 0;
        
        if (amt <= 0) {
            alert("Please enter a valid amount to convert.");
            return;
        }
        if (!window.updateConvertQuote()) {
            return; // invalid balance
        }

        const targetCoin = document.getElementById('cv-target-coin').value;
        const targetAmt = amt * currentConvRate;
        
        // Summary Mapping
        document.getElementById('cs2-src-amt').textContent = amt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('cs2-src-coin').textContent = sourceCoin;
        
        document.getElementById('cs2-tgt-amt').textContent = targetAmt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('cs2-tgt-coin').textContent = targetCoin;
        
        document.getElementById('cs2-rate').textContent = `1 ${sourceCoin} = ${currentConvRate} ${targetCoin}`;
        
        let vaultName = (['USDT', 'USDC'].includes(targetCoin)) ? 'Stablecoin Vault' : 'Fiat Vault';
        document.getElementById('cs2-dest-vault').textContent = vaultName;

        document.getElementById('convert-step-1').style.display = 'none';
        document.getElementById('convert-step-2').style.display = 'flex';
    };

    window.resetConvertDrawer = function() {
        document.getElementById('convert-step-1').style.display = 'flex';
        document.getElementById('convert-step-2').style.display = 'none';
    };

    window.executeConvert = function() {
        const sourceCoin = document.getElementById('cv-source-coin').textContent;
        const targetCoin = document.getElementById('cv-target-coin').value;
        const amt = parseFloat(document.getElementById('cv-amount').value) || 0;
        notifyOrderCreated(
            'Conversion Order Created',
            `${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sourceCoin} to ${targetCoin} conversion order has been created.`,
            'View Convert',
            () => openInbox()
        );
        alert('Asset conversion successful.');
        closeAllDrawers();
    };

    // --- Manage Addresses Drawer Logic ---
    window.openManageAddressesDrawer = function() {
        ALL_DRAWER_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('drawer-active');
        });
        
        window.switchToListAddressView();
        
        lucide.createIcons();
        document.getElementById('manage-addresses-drawer').classList.add('drawer-active');
        document.body.classList.add('drawer-open');
    };

    window.openManageBankAccountsDrawer = function() {
        ALL_DRAWER_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('drawer-active');
        });

        window.switchToBankAccountsListView();
        lucide.createIcons();
        document.getElementById('manage-bank-accounts-drawer').classList.add('drawer-active');
        document.body.classList.add('drawer-open');
    };

    const FIAT_TOPUP_RECIPIENTS = {
        USD: {
            beneficiary: 'Obita Technologies Ltd.',
            bank: 'JPMorgan Chase Bank, N.A.',
            accountNumber: '9876543210',
            routing: '021000021',
            swift: 'CHASUS33',
            reference: 'FV-USD-OBITA'
        },
        HKD: {
            beneficiary: 'Obita Technologies Ltd.',
            bank: 'HSBC Hong Kong',
            accountNumber: '848392301',
            routing: '004-808-8392301',
            swift: 'HSBCHKHHHKH',
            reference: 'FV-HKD-OBITA'
        },
        EUR: {
            beneficiary: 'Obita Technologies Ltd.',
            bank: 'Deutsche Bank AG',
            accountNumber: 'DE89 3704 0044 0532 0130 00',
            routing: 'DE89370400440532013000',
            swift: 'DEUTDEDB',
            reference: 'FV-EUR-OBITA'
        },
        BRL: {
            beneficiary: 'Obita Technologies Ltd.',
            bank: 'Banco Itau BBA',
            accountNumber: '302918475',
            routing: '341 / 0001',
            swift: 'ITAUBRSP',
            reference: 'FV-BRL-OBITA'
        }
    };

    let currentFiatTopUpCurrency = 'USD';

    function getBoundBankAccounts() {
        return Array.from(document.querySelectorAll('#bank-list-container .bank-account-item')).map((item, index) => {
            const actionBtn = item.querySelector('button[data-status]');
            const currencyTag = item.querySelector('[data-role="bank-currency"]');
            const bankName = item.dataset.bankName || `Linked Bank ${index + 1}`;
            const accountName = item.dataset.accountName || 'Bank Account';
            const verification = item.dataset.verification || 'pending';
            const enabled = actionBtn ? actionBtn.dataset.status === 'enabled' : false;
            const sameName = accountName.toLowerCase().includes('obita');

            let reason = '';
            if (!enabled) {
                reason = 'Disabled';
            } else if (verification !== 'verified') {
                reason = verification === 'pending' ? 'Pending Verification' : 'Not Supported';
            } else if (!sameName) {
                reason = 'Bank Account Name mismatch';
            }

            return {
                bankName,
                accountName,
                verification,
                enabled,
                sameName,
                selectable: enabled && verification === 'verified' && sameName,
                reason,
                currency: currencyTag ? currencyTag.textContent.trim() : '',
                summary: item.querySelectorAll('div[style*="font-size: 12px; color: #64748B; line-height: 1.6;"]')[0]?.textContent || ''
            };
        });
    }

    function renderFiatRecipientInfo(currency) {
        const recipient = FIAT_TOPUP_RECIPIENTS[currency];
        if (!recipient) return;

        document.getElementById('fiat-topup-currency-label').textContent = currency;
        document.getElementById('fiat-topup-beneficiary').textContent = recipient.beneficiary;
        document.getElementById('fiat-topup-bank').textContent = recipient.bank;
        document.getElementById('fiat-topup-account-number').textContent = recipient.accountNumber;
        document.getElementById('fiat-topup-routing').textContent = recipient.routing;
        document.getElementById('fiat-topup-swift').textContent = recipient.swift;
        document.getElementById('fiat-topup-reference').textContent = recipient.reference;
        document.getElementById('fiat-topup-step2-currency').value = currency;
        document.getElementById('fiat-topup-step3-currency').textContent = currency;
    }

    function populateFiatTopUpAccountOptions(currency) {
        const select = document.getElementById('fiat-topup-source-account');
        const note = document.getElementById('fiat-topup-account-note');
        const confirmBtn = document.getElementById('fiat-topup-step1-confirm');
        const accounts = getBoundBankAccounts();
        const relevantAccounts = accounts;

        const options = ['<option value="">Select a linked bank account</option>'];

        relevantAccounts.forEach(account => {
            const label = `${account.bankName} - ${account.accountName}${account.reason ? ` (${account.reason})` : ''}`;
            options.push(`<option value="${account.bankName}||${account.accountName}" ${account.selectable ? '' : 'disabled'}>${label}</option>`);
        });

        select.innerHTML = options.join('');

        const hasSelectable = relevantAccounts.some(account => account.selectable);
        note.textContent = hasSelectable
            ? 'Only verified, enabled, same-name bank accounts can be used for fiat top up.'
            : 'No eligible same-name bank account is available. Please bind a verified, enabled bank account under the merchant name first.';
        note.style.color = hasSelectable ? '#64748B' : '#DC2626';
        confirmBtn.disabled = !hasSelectable;
        confirmBtn.style.opacity = hasSelectable ? '1' : '0.5';
        confirmBtn.style.cursor = hasSelectable ? 'pointer' : 'not-allowed';
    }

    function resetFiatTopUpDrawer(currency) {
        currentFiatTopUpCurrency = currency;
        document.getElementById('fiat-topup-drawer-title').textContent = `Top Up ${currency}`;
        document.getElementById('fiat-topup-step-1').style.display = 'flex';
        document.getElementById('fiat-topup-step-2').style.display = 'none';
        document.getElementById('fiat-topup-step-3').style.display = 'none';
        document.getElementById('fiat-topup-source-account').value = '';
        document.getElementById('fiat-topup-amount').value = '';
        document.getElementById('fiat-topup-proof').value = '';
        document.getElementById('fiat-topup-proof-name').textContent = 'No proof uploaded';
        document.getElementById('fiat-topup-step3-order-id').textContent = '-';
        document.getElementById('fiat-topup-step3-source-account').textContent = '-';
        document.getElementById('fiat-topup-step3-amount').textContent = '0.00';
        document.getElementById('fiat-topup-step3-bank').textContent = '-';
        document.getElementById('fiat-topup-step3-reference').textContent = '-';
        renderFiatRecipientInfo(currency);
        populateFiatTopUpAccountOptions(currency);
    }

    window.copyFiatTopUpValue = function(value, btn) {
        navigator.clipboard.writeText(value).then(() => {
            if (!btn) return;
            const original = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px; color: #10B981;"></i>';
            lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = original;
                lucide.createIcons();
            }, 1200);
        });
    };

    window.openFiatTopUpDrawer = function(currency) {
        ALL_DRAWER_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('drawer-active');
        });

        resetFiatTopUpDrawer(currency);
        lucide.createIcons();
        document.getElementById('fiat-topup-drawer').classList.add('drawer-active');
        document.body.classList.add('drawer-open');
    };

    window.goToFiatTopUpStep2 = function() {
        const accountRaw = document.getElementById('fiat-topup-source-account').value;
        if (!accountRaw) {
            alert('Please select an eligible bank account first.');
            return;
        }

        const [bankName, accountName] = accountRaw.split('||');
        document.getElementById('fiat-topup-step2-source-account').textContent = `${bankName} - ${accountName}`;
        document.getElementById('fiat-topup-step-2').style.display = 'flex';
        document.getElementById('fiat-topup-step-1').style.display = 'none';
    };

    window.handleFiatTopUpProofSelected = function(input) {
        const file = input.files && input.files[0];
        document.getElementById('fiat-topup-proof-name').textContent = file ? file.name : 'No proof uploaded';
    };

    window.submitFiatTopUp = function() {
        const accountRaw = document.getElementById('fiat-topup-source-account').value;
        const amount = parseFloat(document.getElementById('fiat-topup-amount').value);
        const currency = document.getElementById('fiat-topup-step2-currency').value;
        const proof = document.getElementById('fiat-topup-proof').files[0];

        if (!accountRaw) {
            alert('Please select the remitting bank account.');
            return;
        }

        if (!amount || amount <= 0) {
            alert('Please enter a valid top up amount.');
            return;
        }

        if (!proof) {
            alert('Please upload the remittance proof.');
            return;
        }

        const [bankName, accountName] = accountRaw.split('||');
        const orderId = `FV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

        document.getElementById('fiat-topup-step3-order-id').textContent = orderId;
        document.getElementById('fiat-topup-step3-source-account').textContent = `${bankName} - ${accountName}`;
        document.getElementById('fiat-topup-step3-amount').textContent = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('fiat-topup-step3-proof').textContent = proof.name;
        document.getElementById('fiat-topup-step3-bank').textContent = FIAT_TOPUP_RECIPIENTS[currency].bank;
        document.getElementById('fiat-topup-step3-reference').textContent = FIAT_TOPUP_RECIPIENTS[currency].reference;
        notifyOrderCreated(
            'Fiat Top Up Order Created',
            `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency} top up order ${orderId} is now Proceeding.`,
            'View Order',
            () => openInbox()
        );
        document.getElementById('fiat-topup-step-2').style.display = 'none';
        document.getElementById('fiat-topup-step-3').style.display = 'flex';
    };

    window.switchToAddBankAccountView = function() {
        document.getElementById('bank-list-view').style.display = 'none';
        document.getElementById('add-bank-view').style.display = 'flex';
        document.getElementById('bank-account-form').reset();
        document.getElementById('bank-statement-file-name').textContent = 'No file selected';
    };

    window.switchToBankAccountsListView = function() {
        document.getElementById('bank-list-view').style.display = 'flex';
        document.getElementById('add-bank-view').style.display = 'none';
    };

    window.handleBankStatementSelected = function(input) {
        const label = document.getElementById('bank-statement-file-name');
        const file = input.files && input.files[0];
        label.textContent = file ? file.name : 'No file selected';
    };

    window.toggleBankAccountStatus = function(btn) {
        const card = btn.closest('.bank-account-item');
        const currentStatus = btn.dataset.status || 'enabled';

        if (currentStatus === 'enabled') {
            btn.dataset.status = 'disabled';
            btn.textContent = 'Disabled';
            btn.style.background = '#F1F5F9';
            btn.style.color = '#64748B';
            btn.style.borderColor = '#CBD5E1';
            card.style.opacity = card.dataset.verification === 'not-supported' ? '0.6' : '0.78';
        } else {
            btn.dataset.status = 'enabled';
            btn.textContent = 'Enabled';
            btn.style.background = '#D1FAE5';
            btn.style.color = '#059669';
            btn.style.borderColor = '#10B981';
            card.style.opacity = card.dataset.verification === 'not-supported' ? '0.72' : '1';
        }
    };

    window.deleteBankAccount = function(btn) {
        if (confirm('Are you sure you want to delete this bank account?')) {
            btn.closest('.bank-account-item').remove();
        }
    };

    window.submitNewBankAccount = function() {
        const bankName = document.getElementById('bank-name').value;
        const accountName = document.getElementById('bank-account-name').value.trim();
        const currency = document.getElementById('bank-currency').value;
        const accountNumber = document.getElementById('bank-account-number').value.trim();
        const routingOrIban = document.getElementById('bank-routing').value.trim();
        const swift = document.getElementById('bank-swift').value.trim();
        const statementInput = document.getElementById('bank-statement');
        const statementFile = statementInput.files && statementInput.files[0];

        if (!bankName || !accountName || !accountNumber || !routingOrIban || !swift) {
            alert('Please complete all required bank account fields.');
            return;
        }

        if (!statementFile) {
            alert('Please upload the latest bank statement for verification.');
            return;
        }

        const maskedAccount = accountNumber.length > 4 ? `•••• ${accountNumber.slice(-4)}` : accountNumber;
        const bankIconStyle = currency === 'USD'
            ? 'background-color: #EFF6FF; border: 1px solid #BFDBFE;'
            : currency === 'HKD'
                ? 'background-color: #FEF2F2; border: 1px solid #FECACA;'
                : currency === 'EUR'
                    ? 'background-color: #F5F3FF; border: 1px solid #DDD6FE;'
                    : 'background-color: #F0FDF4; border: 1px solid #BBF7D0;';
        const bankIconColor = currency === 'USD'
            ? '#2563EB'
            : currency === 'HKD'
                ? '#DC2626'
                : currency === 'EUR'
                    ? '#7C3AED'
                    : '#15803D';
        const currencyBadgeStyle = currency === 'USD'
            ? 'background: #DBEAFE; color: #1D4ED8;'
            : currency === 'HKD'
                ? 'background: #FEE2E2; color: #DC2626;'
                : currency === 'EUR'
                    ? 'background: #EDE9FE; color: #7C3AED;'
                    : 'background: #DCFCE7; color: #15803D;';

        const newHtml = `
            <div class="bank-account-item" data-bank-name="${bankName}" data-account-name="${accountName}" data-verification="pending" style="border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; background: #FFF; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;">
                <div style="display: flex; gap: 14px; flex: 1; min-width: 0;">
                    <div style="padding: 10px; border-radius: 10px; flex-shrink: 0; ${bankIconStyle}">
                        <i data-lucide="landmark" style="color: ${bankIconColor}; width: 18px; height: 18px;"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                            <span style="font-weight: 600; font-size: 14px; color: #0F172A;">${bankName} — ${accountName}</span>
                            <span data-role="bank-currency" style="${currencyBadgeStyle} font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${currency}</span>
                            <span style="background: #FEF3C7; color: #D97706; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">Pending Verification</span>
                        </div>
                        <div style="font-size: 12px; color: #64748B; line-height: 1.6;">Account: ${maskedAccount} | Routing / IBAN: ${routingOrIban} | SWIFT: ${swift}</div>
                        <div style="font-size: 12px; color: #94A3B8; margin-top: 6px;">Statement uploaded: ${statementFile.name}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <button onclick="window.toggleBankAccountStatus(this)" data-status="enabled" style="padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid #10B981; background: #D1FAE5; color: #059669; cursor: pointer;">Enabled</button>
                    <button onclick="window.deleteBankAccount(this)" style="background: none; border: none; cursor: pointer; color: #94A3B8;"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
                </div>
            </div>`;

        document.getElementById('bank-list-container').insertAdjacentHTML('afterbegin', newHtml);
        lucide.createIcons();
        alert('Bank account added. Verification is pending after statement upload.');
        window.switchToBankAccountsListView();
    };

    const approvalRules = [
        {
            id: 'AR-001',
            name: 'Large Fiat Payout Review',
            scope: 'Payout',
            triggerOperator: 'greater_than',
            triggerValue: '50000',
            approverLevel1: 'Finance Manager',
            approverLevel2: 'Operations Director',
            approverLevel3: '',
            updatedAt: 'Today, 09:30',
            status: 'enabled',
            notes: 'Requires sequential approval for large outbound fiat payouts to reduce settlement and fraud risk.'
        },
        {
            id: 'AR-002',
            name: 'Stablecoin Withdrawal Dual Approval',
            scope: 'Stablecoin Vault - Transfer',
            triggerOperator: 'greater_than',
            triggerValue: '100000',
            approverLevel1: 'Treasury Lead',
            approverLevel2: 'Compliance Officer',
            approverLevel3: '',
            updatedAt: 'Yesterday, 16:10',
            status: 'enabled',
            notes: 'Applies dual approval to large stablecoin withdrawals before wallet release.'
        },
        {
            id: 'AR-003',
            name: 'New Bank Account Binding Check',
            scope: 'Fiat Vault - Bank Account',
            triggerOperator: 'greater_than',
            triggerValue: '0',
            approverLevel1: 'Operations Analyst',
            approverLevel2: '',
            approverLevel3: '',
            updatedAt: 'Apr 2, 2026',
            status: 'disabled',
            notes: 'Used for manual review of new bank account binding and statement verification.'
        }
    ];

    const approvalRequests = [
        {
            id: 'APR-20260406-0012',
            title: 'Fiat Vault Transfer Approval',
            scope: 'Fiat Vault - Transfer',
            orderId: 'FT-20260406-0182',
            type: 'Transfer',
            requester: 'Nancy User',
            subject: 'Global Trade Holdings',
            amount: '125000.00',
            currency: 'USD',
            status: 'pending',
            levelLabel: 'Level 1 of 2',
            submittedAt: 'Apr 6, 2026 15:42',
            submittedAtValue: new Date('2026-04-06T15:42:00+08:00').getTime(),
            notes: 'Urgent supplier settlement for treasury operations.'
        },
        {
            id: 'APR-20260406-0011',
            title: 'Stablecoin Vault Transfer Approval',
            scope: 'Stablecoin Vault - Transfer',
            orderId: 'SV-20260406-0094',
            type: 'Transfer',
            requester: 'Nancy User',
            subject: 'Wintermute Treasury',
            amount: '85000.00',
            currency: 'USDT',
            status: 'pending',
            levelLabel: 'Level 2 of 2',
            submittedAt: 'Apr 6, 2026 14:08',
            submittedAtValue: new Date('2026-04-06T14:08:00+08:00').getTime(),
            notes: 'Second-level approval required before wallet release.'
        },
        {
            id: 'APR-20260405-0039',
            title: 'Conversion Approval',
            scope: 'Conversion',
            orderId: 'CV-20260405-0067',
            type: 'Convert',
            requester: 'Ethan Lee',
            subject: 'USD to USDC conversion',
            amount: '300000.00',
            currency: 'USD',
            status: 'approved',
            levelLabel: 'Completed',
            submittedAt: 'Apr 5, 2026 18:20',
            submittedAtValue: new Date('2026-04-05T18:20:00+08:00').getTime(),
            notes: 'Approved by Finance Manager for end-of-day rebalancing.'
        },
        {
            id: 'APR-20260405-0027',
            title: 'Fiat Vault Bank Account Approval',
            scope: 'Fiat Vault - Bank Account',
            orderId: 'BA-20260405-0018',
            type: 'Bank Account',
            requester: 'Emily Chen',
            subject: 'New DBS Treasury Settlement Account',
            amount: '0.00',
            currency: 'USD',
            status: 'pending',
            levelLabel: 'Level 1 of 1',
            submittedAt: 'Apr 5, 2026 13:16',
            submittedAtValue: new Date('2026-04-05T13:16:00+08:00').getTime(),
            notes: 'Statement uploaded and waiting for bank account binding approval.'
        },
        {
            id: 'APR-20260404-0041',
            title: 'Collection Cancel Order Approval',
            scope: 'Collection - Cancel Order',
            orderId: 'CO-20260404-0146',
            type: 'Cancel Order',
            requester: 'Marcus Tan',
            subject: 'Invoice INV-240406-8821',
            amount: '4200.00',
            currency: 'EUR',
            status: 'rejected',
            levelLabel: 'Completed',
            submittedAt: 'Apr 4, 2026 19:05',
            submittedAtValue: new Date('2026-04-04T19:05:00+08:00').getTime(),
            notes: 'Rejected due to duplicate cancellation request.'
        }
    ];

    let approvalRuleView = 'list';
    let activeApprovalRuleId = null;
    let approvalRuleFormLevels = 1;
    let approvalListView = 'list';
    let activeApprovalRequestId = null;
    let expandedApprovalActionId = null;
    let activeApprovalDecision = null;

    function getApprovalRuleById(ruleId) {
        return approvalRules.find(rule => rule.id === ruleId);
    }

    function getApprovalRequestById(requestId) {
        return approvalRequests.find(request => request.id === requestId);
    }

    function formatApprovalRuleTrigger(rule) {
        const operatorLabels = {
            greater_than: 'Amount >',
            greater_than_or_equal: 'Amount >='
        };
        const label = operatorLabels[rule.triggerOperator] || 'Amount >';
        return `${label} ${rule.triggerValue || '0'}`;
    }

    function formatApprovalFlow(rule) {
        return [rule.approverLevel1, rule.approverLevel2, rule.approverLevel3].filter(Boolean).join(' -> ') || '-';
    }

    function getApprovalRuleLevelCount(rule) {
        if (!rule) return 1;
        if (rule.approverLevel3) return 3;
        if (rule.approverLevel2) return 2;
        return 1;
    }

    function getApprovalRequestStatusPill(status) {
        const styles = {
            pending: { background: '#F8FAFC', color: '#64748B', label: 'Pending' },
            approved: { background: '#F0FDF4', color: '#15803D', label: 'Approved' },
            rejected: { background: '#FEF2F2', color: '#B91C1C', label: 'Rejected' }
        };
        return styles[status] || styles.pending;
    }

    function getFilteredApprovalRequests() {
        const scopeFilter = document.getElementById('approval-list-scope-filter')?.value || 'all';
        const statusFilter = document.getElementById('approval-list-status-filter')?.value || 'all';
        const keyword = (document.getElementById('approval-list-search')?.value || '').trim().toLowerCase();

        return approvalRequests
            .slice()
            .sort((a, b) => b.submittedAtValue - a.submittedAtValue)
            .filter(request => {
                if (scopeFilter !== 'all' && request.scope !== scopeFilter) return false;
                if (statusFilter !== 'all' && request.status !== statusFilter) return false;
                if (!keyword) return true;

                const haystack = [
                    request.id,
                    request.title,
                    request.scope,
                    request.orderId,
                    request.subject,
                    request.requester,
                    request.currency
                ].join(' ').toLowerCase();

                return haystack.includes(keyword);
            });
    }

    function renderApprovalDecisionPanel(requestId, compact = false) {
        const isExpanded = expandedApprovalActionId === requestId;
        const isReject = activeApprovalDecision === 'rejected';
        const isApprove = activeApprovalDecision === 'approved';

        return `
            <div id="approval-action-panel-${requestId}" style="display: ${isExpanded ? 'block' : 'none'}; ${compact ? '' : 'padding: 0 24px 18px 24px;'}">
                <div style="padding: ${compact ? '0' : '16px 18px'}; border: 1px solid #E2E8F0; border-radius: 14px; background: linear-gradient(180deg, #FCFDFE 0%, #F8FAFC 100%); display: flex; flex-direction: column; gap: 14px;">
                    <div>
                        <div style="font-size: 13px; font-weight: 700; color: #0F172A;">Submit Review</div>
                        <div style="font-size: 12px; color: #64748B; margin-top: 4px; line-height: 1.5;">Choose your decision first. Review notes are required only when rejecting.</div>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn ${isApprove ? 'btn-primary' : 'btn-outline'}" onclick="window.selectApprovalDecision('${requestId}', 'approved'); event.stopPropagation();" style="padding: 8px 14px; font-size: 12px;">Approve</button>
                        <button class="btn ${isReject ? 'btn-primary' : 'btn-outline text-danger'}" onclick="window.selectApprovalDecision('${requestId}', 'rejected'); event.stopPropagation();" style="padding: 8px 14px; font-size: 12px;">Reject</button>
                    </div>
                    ${isReject ? `
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <label style="font-size: 12px; font-weight: 700; color: #475569;">Review Notes *</label>
                            <textarea id="approval-review-notes-${requestId}" class="bank-form-control" style="min-height: ${compact ? '96px' : '84px'}; padding: 12px 14px; background: #FFFFFF;" placeholder="Explain why this request is being rejected."></textarea>
                        </div>
                    ` : ''}
                    <div style="display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-outline" onclick="window.toggleApprovalActionMenu('${requestId}'); event.stopPropagation();" style="padding: 8px 14px; font-size: 12px;">Cancel</button>
                        <button class="btn btn-primary" onclick="window.submitApprovalDecision('${requestId}'); event.stopPropagation();" style="padding: 8px 14px; font-size: 12px;" ${activeApprovalDecision ? '' : 'disabled'}>${isReject ? 'Submit Rejection' : 'Submit Review'}</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderApprovalListPage() {
        const activeRequest = activeApprovalRequestId ? getApprovalRequestById(activeApprovalRequestId) : null;

        if (approvalListView === 'detail' && activeRequest) {
            const detailStatus = getApprovalRequestStatusPill(activeRequest.status);
            contentBody.innerHTML = `
                <div class="fade-in" style="max-width: 940px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
                    <div class="card" style="padding: 24px;">
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                            <div>
                                <button onclick="window.openApprovalListPage()" style="background: none; border: none; color: #64748B; cursor: pointer; padding: 0; font-size: 13px; font-weight: 600; margin-bottom: 12px;">← Back to Approval List</button>
                                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                    <h2 style="font-size: 24px; font-weight: 700; color: #0F172A; margin: 0;">${activeRequest.title}</h2>
                                    <span style="background: ${detailStatus.background}; color: ${detailStatus.color}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase;">${detailStatus.label}</span>
                                </div>
                                <div style="font-size: 13px; color: #64748B; margin-top: 8px;">Request ID: ${activeRequest.id} · Submitted ${activeRequest.submittedAt}</div>
                            </div>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                ${activeRequest.status === 'pending' ? `
                                    <button class="btn btn-primary" onclick="window.toggleApprovalActionMenu('${activeRequest.id}'); event.stopPropagation();" style="padding: 10px 16px; font-size: 13px; box-shadow: 0 8px 16px rgba(37, 99, 235, 0.18);">Review</button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1.45fr 1fr; gap: 20px;">
                        <div class="card" style="padding: 24px; display: flex; flex-direction: column; gap: 18px;">
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Scope</div>
                                <div style="font-size: 15px; font-weight: 600; color: #0F172A;">${activeRequest.scope}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Order ID</div>
                                <div style="font-size: 14px; color: #334155; font-family: monospace;">${activeRequest.orderId}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Subject</div>
                                <div style="font-size: 14px; color: #334155; line-height: 1.7;">${activeRequest.subject}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Amount</div>
                                <div style="font-size: 20px; font-weight: 700; color: #0F172A;">${activeRequest.amount} ${activeRequest.currency}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Notes</div>
                                <div style="font-size: 14px; color: #334155; line-height: 1.7;">${activeRequest.notes || '-'}</div>
                            </div>
                        </div>

                        <div class="card" style="padding: 24px; display: flex; flex-direction: column; gap: 18px;">
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Requester</div>
                                <div style="font-size: 14px; color: #334155;">${activeRequest.requester}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Approval Step</div>
                                <div style="font-size: 14px; color: #334155;">${activeRequest.levelLabel}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Type</div>
                                <div style="font-size: 14px; color: #334155;">${activeRequest.type}</div>
                            </div>
                            <div style="padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; font-size: 12px; color: #64748B; line-height: 1.6;">
                                Approval decisions are recorded immediately and reflected in the request status.
                            </div>
                            ${activeRequest.status === 'pending' ? `
                                ${renderApprovalDecisionPanel(activeRequest.id, true)}
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const requests = getFilteredApprovalRequests();
        const scopeOptions = [
            'Payout',
            'Fiat Vault - Transfer',
            'Fiat Vault - Bank Account',
            'Stablecoin Vault - Transfer',
            'Stablecoin Vault - Address Book',
            'Conversion',
            'Collection - Cancel Order'
        ];
        const currentScope = document.getElementById('approval-list-scope-filter')?.value || 'all';
        const currentStatus = document.getElementById('approval-list-status-filter')?.value || 'all';
        const currentSearch = document.getElementById('approval-list-search')?.value || '';

        contentBody.innerHTML = `
            <div class="fade-in" style="display: flex; flex-direction: column; gap: 16px;">
                <div class="card" style="padding: 24px;">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                        <div>
                            <h2 style="font-size: 24px; font-weight: 700; color: #0F172A; margin: 0 0 8px;">Approval List</h2>
                            <div style="font-size: 13px; color: #64748B; line-height: 1.6;">Review all approval requests in reverse chronological order and take action on pending items.</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <div style="display: inline-flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 14px; background: linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%); color: #1D4ED8; border: 1px solid #BFDBFE; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.08);">
                                <div style="width: 28px; height: 28px; border-radius: 999px; background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center;">
                                    <i data-lucide="bell-ring" style="width: 14px; height: 14px;"></i>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 2px;">
                                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.75;">Needs Attention</div>
                                    <div style="font-size: 14px; font-weight: 800; line-height: 1;">${approvalRequests.filter(request => request.status === 'pending').length} Pending</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 0; overflow: hidden;">
                    <div style="padding: 18px 24px; border-bottom: 1px solid var(--clr-border); background: #FCFDFE; display: flex; flex-direction: column; gap: 14px;">
                        <div style="display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 14px;">
                            <div style="position: relative;">
                                <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: #94A3B8;"></i>
                                <input id="approval-list-search" type="text" value="${currentSearch}" oninput="window.renderApprovalListPage()" placeholder="Search by request ID, order ID, scope or requester" style="width: 100%; padding: 11px 14px 11px 38px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 13px; color: #0F172A; background: #FFFFFF; outline: none;">
                            </div>
                            <select id="approval-list-scope-filter" onchange="window.renderApprovalListPage()" style="width: 100%; padding: 11px 14px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 13px; color: #0F172A; background: #FFFFFF; outline: none;">
                                <option value="all">All Scopes</option>
                                ${scopeOptions.map(scope => `<option value="${scope}" ${currentScope === scope ? 'selected' : ''}>${scope}</option>`).join('')}
                            </select>
                            <select id="approval-list-status-filter" onchange="window.renderApprovalListPage()" style="width: 100%; padding: 11px 14px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 13px; color: #0F172A; background: #FFFFFF; outline: none;">
                                <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>All Statuses</option>
                                <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="approved" ${currentStatus === 'approved' ? 'selected' : ''}>Approved</option>
                                <option value="rejected" ${currentStatus === 'rejected' ? 'selected' : ''}>Rejected</option>
                            </select>
                        </div>
                        <div style="display: grid; grid-template-columns: 1.45fr 1fr 0.9fr 0.9fr 1fr; gap: 16px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em;">
                        <div>Request</div>
                        <div>Scope</div>
                        <div>Amount</div>
                        <div>Status</div>
                        <div style="text-align: right;">Actions</div>
                    </div>
                    </div>
                    <div>
                        ${requests.length ? requests.map(request => {
                            const statusPill = getApprovalRequestStatusPill(request.status);
                            return `
                                <div style="border-bottom: 1px solid var(--clr-border);">
                                    <div onclick="window.openApprovalRequestDetail('${request.id}')" style="padding: 18px 24px; display: grid; grid-template-columns: 1.45fr 1fr 0.9fr 0.9fr 1fr; gap: 16px; align-items: center; cursor: pointer;">
                                        <div>
                                        <div style="font-size: 14px; font-weight: 700; color: #0F172A;">${request.title}</div>
                                            <div style="font-size: 12px; color: #64748B; margin-top: 6px; line-height: 1.5;">${request.id} · ${request.orderId} · ${request.submittedAt}</div>
                                        </div>
                                        <div style="font-size: 13px; color: #334155; line-height: 1.5;">${request.scope}</div>
                                        <div style="font-size: 13px; color: #0F172A; font-weight: 600;">${request.amount} ${request.currency}</div>
                                        <div><span style="background: ${statusPill.background}; color: ${statusPill.color}; font-size: 11px; font-weight: 600; padding: 4px 10px; border: 1px solid #E2E8F0; border-radius: 999px; text-transform: uppercase;">${statusPill.label}</span></div>
                                        <div style="display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
                                            ${request.status === 'pending'
                                                ? `<button class="btn btn-primary" onclick="window.toggleApprovalActionMenu('${request.id}'); event.stopPropagation();" style="padding: 7px 14px; font-size: 12px; box-shadow: 0 8px 16px rgba(37, 99, 235, 0.18);">Review</button>`
                                                : `<button class="btn btn-outline" onclick="window.openApprovalRequestDetail('${request.id}'); event.stopPropagation();" style="padding: 6px 12px; font-size: 12px;">View</button>`
                                            }
                                        </div>
                                    </div>
                                    ${renderApprovalDecisionPanel(request.id)}
                                </div>
                            `;
                        }).join('') : `
                            <div style="padding: 48px 24px; text-align: center; color: #64748B; font-size: 14px;">
                                No approval requests matched your current filters.
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    }

    function renderApprovalRulesPage() {
        const activeRule = activeApprovalRuleId ? getApprovalRuleById(activeApprovalRuleId) : null;

        if (approvalRuleView === 'detail' && activeRule) {
            contentBody.innerHTML = `
                <div class="fade-in" style="max-width: 920px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
                    <div class="card" style="padding: 24px;">
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                            <div>
                                <button onclick="window.openApprovalRulesList()" style="background: none; border: none; color: #64748B; cursor: pointer; padding: 0; font-size: 13px; font-weight: 600; margin-bottom: 12px;">← Back to Approval Rules</button>
                                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                    <h2 style="font-size: 24px; font-weight: 700; color: #0F172A; margin: 0;">${activeRule.name}</h2>
                                    <span style="background: ${activeRule.status === 'enabled' ? '#D1FAE5' : '#E2E8F0'}; color: ${activeRule.status === 'enabled' ? '#059669' : '#64748B'}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase;">${activeRule.status}</span>
                                </div>
                                <div style="font-size: 13px; color: #64748B; margin-top: 8px;">Rule ID: ${activeRule.id} · Updated ${activeRule.updatedAt}</div>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button class="btn btn-outline" onclick="window.editApprovalRule('${activeRule.id}')" style="padding: 10px 16px; font-size: 13px;">Edit</button>
                                <button class="btn btn-outline" onclick="window.toggleApprovalRuleStatus('${activeRule.id}')" style="padding: 10px 16px; font-size: 13px;">${activeRule.status === 'enabled' ? 'Disable' : 'Enable'}</button>
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px;">
                        <div class="card" style="padding: 24px; display: flex; flex-direction: column; gap: 18px;">
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Scope</div>
                                <div style="font-size: 15px; font-weight: 600; color: #0F172A;">${activeRule.scope}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Trigger Condition</div>
                                <div style="font-size: 14px; color: #334155; line-height: 1.7;">${formatApprovalRuleTrigger(activeRule)}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Approval Flow</div>
                                <div style="font-size: 14px; color: #334155; line-height: 1.7;">${formatApprovalFlow(activeRule)}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Notes</div>
                                <div style="font-size: 14px; color: #334155; line-height: 1.7;">${activeRule.notes || '-'}</div>
                            </div>
                        </div>

                        <div class="card" style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
                            <div style="font-size: 13px; font-weight: 700; color: #0F172A;">Rule Actions</div>
                            <button class="btn btn-outline" onclick="window.editApprovalRule('${activeRule.id}')" style="justify-content: center; padding: 10px 14px;">Edit Rule</button>
                            <button class="btn btn-outline" onclick="window.toggleApprovalRuleStatus('${activeRule.id}')" style="justify-content: center; padding: 10px 14px;">${activeRule.status === 'enabled' ? 'Disable Rule' : 'Enable Rule'}</button>
                            <button class="btn btn-outline text-danger" onclick="window.deleteApprovalRule('${activeRule.id}')" style="justify-content: center; padding: 10px 14px;">Delete Rule</button>
                            <div style="margin-top: 8px; padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; font-size: 12px; color: #64748B; line-height: 1.6;">
                                Rule changes take effect immediately for newly created orders and approval tasks.
                            </div>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        if (approvalRuleView === 'form') {
            const editingRule = activeRule;
            contentBody.innerHTML = `
                <div class="fade-in" style="max-width: 760px; margin: 0 auto;">
                    <div class="card" style="padding: 24px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                            <button onclick="window.openApprovalRulesList()" style="background: none; border: none; color: #64748B; cursor: pointer; padding: 4px;"><i data-lucide="arrow-left" style="width: 18px; height: 18px;"></i></button>
                            <div>
                                <h2 style="font-size: 22px; font-weight: 700; color: #0F172A; margin: 0;">${editingRule ? 'Edit Approval Rule' : 'Add Approval Rule'}</h2>
                                <div style="font-size: 13px; color: #64748B; margin-top: 4px;">Configure when approvals are triggered and who needs to approve.</div>
                            </div>
                        </div>

                        <form id="approval-rule-form" onsubmit="event.preventDefault(); window.saveApprovalRule('${editingRule ? editingRule.id : ''}');" style="display: flex; flex-direction: column; gap: 18px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    <label class="bank-form-label">Rule Name *</label>
                                    <input id="approval-rule-name" class="bank-form-control" type="text" value="${editingRule ? editingRule.name : ''}" placeholder="e.g. High Risk Payout Review">
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    <label class="bank-form-label">Scope *</label>
                                    <select id="approval-rule-scope" class="bank-form-control">
                                        <option value="Payout" ${editingRule && editingRule.scope === 'Payout' ? 'selected' : ''}>Payout</option>
                                        <option value="Fiat Vault - Transfer" ${editingRule && editingRule.scope === 'Fiat Vault - Transfer' ? 'selected' : ''}>Fiat Vault - Transfer</option>
                                        <option value="Fiat Vault - Bank Account" ${editingRule && editingRule.scope === 'Fiat Vault - Bank Account' ? 'selected' : ''}>Fiat Vault - Bank Account</option>
                                        <option value="Stablecoin Vault - Transfer" ${editingRule && editingRule.scope === 'Stablecoin Vault - Transfer' ? 'selected' : ''}>Stablecoin Vault - Transfer</option>
                                        <option value="Stablecoin Vault - Address Book" ${editingRule && editingRule.scope === 'Stablecoin Vault - Address Book' ? 'selected' : ''}>Stablecoin Vault - Address Book</option>
                                        <option value="Conversion" ${editingRule && editingRule.scope === 'Conversion' ? 'selected' : ''}>Conversion</option>
                                        <option value="Collection - Cancel Order" ${editingRule && editingRule.scope === 'Collection - Cancel Order' ? 'selected' : ''}>Collection - Cancel Order</option>
                                    </select>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    <label class="bank-form-label">Trigger Condition *</label>
                                    <select id="approval-rule-trigger-operator" class="bank-form-control">
                                        <option value="greater_than" ${editingRule && editingRule.triggerOperator === 'greater_than' ? 'selected' : ''}>Amount greater than</option>
                                        <option value="greater_than_or_equal" ${editingRule && editingRule.triggerOperator === 'greater_than_or_equal' ? 'selected' : ''}>Amount greater than or equal to</option>
                                    </select>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    <label class="bank-form-label">Amount *</label>
                                    <input id="approval-rule-trigger-value" class="bank-form-control" type="number" value="${editingRule ? editingRule.triggerValue : ''}" placeholder="e.g. 50000">
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <div style="font-size: 12px; color: #64748B; line-height: 1.5;">Set the rule with an amount condition and the exact threshold that should trigger approval.</div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <label class="bank-form-label">Approval Flow *</label>
                                <div style="font-size: 12px; color: #64748B; line-height: 1.5;">Start with 1 approver, then add a 2nd or 3rd level only when needed.</div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        <label class="bank-form-label">1st Approver *</label>
                                        <select id="approval-rule-approver-1" class="bank-form-control">
                                            <option value="">Select approver</option>
                                            <option value="Finance Manager" ${editingRule && editingRule.approverLevel1 === 'Finance Manager' ? 'selected' : ''}>Finance Manager</option>
                                            <option value="Operations Director" ${editingRule && editingRule.approverLevel1 === 'Operations Director' ? 'selected' : ''}>Operations Director</option>
                                            <option value="Treasury Lead" ${editingRule && editingRule.approverLevel1 === 'Treasury Lead' ? 'selected' : ''}>Treasury Lead</option>
                                            <option value="Compliance Officer" ${editingRule && editingRule.approverLevel1 === 'Compliance Officer' ? 'selected' : ''}>Compliance Officer</option>
                                            <option value="Operations Analyst" ${editingRule && editingRule.approverLevel1 === 'Operations Analyst' ? 'selected' : ''}>Operations Analyst</option>
                                        </select>
                                    </div>
                                    <div id="approval-rule-level-2" style="display: ${approvalRuleFormLevels >= 2 ? 'flex' : 'none'}; flex-direction: column; gap: 8px;">
                                        <label class="bank-form-label">2nd Approver</label>
                                        <select id="approval-rule-approver-2" class="bank-form-control">
                                            <option value="">Select approver</option>
                                            <option value="Finance Manager" ${editingRule && editingRule.approverLevel2 === 'Finance Manager' ? 'selected' : ''}>Finance Manager</option>
                                            <option value="Operations Director" ${editingRule && editingRule.approverLevel2 === 'Operations Director' ? 'selected' : ''}>Operations Director</option>
                                            <option value="Treasury Lead" ${editingRule && editingRule.approverLevel2 === 'Treasury Lead' ? 'selected' : ''}>Treasury Lead</option>
                                            <option value="Compliance Officer" ${editingRule && editingRule.approverLevel2 === 'Compliance Officer' ? 'selected' : ''}>Compliance Officer</option>
                                            <option value="Operations Analyst" ${editingRule && editingRule.approverLevel2 === 'Operations Analyst' ? 'selected' : ''}>Operations Analyst</option>
                                        </select>
                                    </div>
                                    <div id="approval-rule-level-3" style="display: ${approvalRuleFormLevels >= 3 ? 'flex' : 'none'}; flex-direction: column; gap: 8px;">
                                        <label class="bank-form-label">3rd Approver</label>
                                        <select id="approval-rule-approver-3" class="bank-form-control">
                                            <option value="">Select approver</option>
                                            <option value="Finance Manager" ${editingRule && editingRule.approverLevel3 === 'Finance Manager' ? 'selected' : ''}>Finance Manager</option>
                                            <option value="Operations Director" ${editingRule && editingRule.approverLevel3 === 'Operations Director' ? 'selected' : ''}>Operations Director</option>
                                            <option value="Treasury Lead" ${editingRule && editingRule.approverLevel3 === 'Treasury Lead' ? 'selected' : ''}>Treasury Lead</option>
                                            <option value="Compliance Officer" ${editingRule && editingRule.approverLevel3 === 'Compliance Officer' ? 'selected' : ''}>Compliance Officer</option>
                                            <option value="Operations Analyst" ${editingRule && editingRule.approverLevel3 === 'Operations Analyst' ? 'selected' : ''}>Operations Analyst</option>
                                        </select>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                    <button id="approval-rule-add-level-btn" type="button" class="btn btn-outline" onclick="window.addApprovalFlowLevel()" style="padding: 8px 14px; font-size: 12px; display: ${approvalRuleFormLevels >= 3 ? 'none' : 'inline-flex'};">Add Next Level</button>
                                    <button id="approval-rule-remove-level-btn" type="button" class="btn btn-outline" onclick="window.removeApprovalFlowLevel()" style="padding: 8px 14px; font-size: 12px; display: ${approvalRuleFormLevels > 1 ? 'inline-flex' : 'none'};">Remove Last Level</button>
                                    <div style="font-size: 12px; color: #64748B;">Maximum 3 approval levels.</div>
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <label class="bank-form-label">Notes</label>
                                <textarea id="approval-rule-notes" class="bank-form-control" style="min-height: 72px; padding: 12px 14px;" placeholder="Add short notes for this rule...">${editingRule ? editingRule.notes || '' : ''}</textarea>
                            </div>
                            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                                <button type="button" class="btn btn-outline" onclick="window.openApprovalRulesList()" style="padding: 10px 16px;">Cancel</button>
                                <button type="submit" class="btn btn-primary" style="padding: 10px 18px;">${editingRule ? 'Save Changes' : 'Create Rule'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        contentBody.innerHTML = `
            <div class="fade-in" style="display: flex; flex-direction: column; gap: 24px;">
                <div class="card" style="padding: 24px;">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                        <div>
                            <h2 style="font-size: 24px; font-weight: 700; color: #0F172A; margin: 0 0 8px;">Approval Rules</h2>
                            <div style="font-size: 13px; color: #64748B; line-height: 1.6;">Manage all approval rule configurations for payouts, vault operations, and risk-sensitive workflows.</div>
                        </div>
                        <button class="bank-add-btn" onclick="window.createApprovalRule()">
                            <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
                            Add Approval Rule
                        </button>
                    </div>
                </div>

                <div class="card" style="padding: 0; overflow: hidden;">
                    <div style="padding: 16px 24px; border-bottom: 1px solid var(--clr-border); background: #FCFDFE; display: grid; grid-template-columns: 1.4fr 1fr 1.2fr 0.8fr 1fr; gap: 16px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em;">
                        <div>Rule</div>
                        <div>Scope</div>
                        <div>Approvers</div>
                        <div>Status</div>
                        <div style="text-align: right;">Actions</div>
                    </div>
                    <div>
                        ${approvalRules.map(rule => `
                            <div style="padding: 18px 24px; border-bottom: 1px solid var(--clr-border); display: grid; grid-template-columns: 1.4fr 1fr 1.2fr 0.8fr 1fr; gap: 16px; align-items: center;">
                                <div onclick="window.openApprovalRuleDetail('${rule.id}')" style="cursor: pointer;">
                                    <div style="font-size: 14px; font-weight: 700; color: #0F172A;">${rule.name}</div>
                                    <div style="font-size: 12px; color: #64748B; margin-top: 6px; line-height: 1.5;">${formatApprovalRuleTrigger(rule)}</div>
                                </div>
                                <div style="font-size: 13px; color: #334155;">${rule.scope}</div>
                                <div style="font-size: 13px; color: #334155; line-height: 1.5;">${formatApprovalFlow(rule)}</div>
                                <div><span style="background: ${rule.status === 'enabled' ? '#D1FAE5' : '#E2E8F0'}; color: ${rule.status === 'enabled' ? '#059669' : '#64748B'}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase;">${rule.status}</span></div>
                                <div style="display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
                                    <button class="btn btn-outline" onclick="window.toggleApprovalRuleStatus('${rule.id}')" style="padding: 6px 12px; font-size: 12px;">${rule.status === 'enabled' ? 'Disable' : 'Enable'}</button>
                                    <button class="btn btn-outline" onclick="window.editApprovalRule('${rule.id}')" style="padding: 6px 12px; font-size: 12px;">Edit</button>
                                    <button class="btn btn-outline text-danger" onclick="window.deleteApprovalRule('${rule.id}')" style="padding: 6px 12px; font-size: 12px;">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    }

    window.openApprovalRulesList = function() {
        approvalRuleView = 'list';
        activeApprovalRuleId = null;
        renderApprovalRulesPage();
    };

    window.openApprovalListPage = function() {
        approvalListView = 'list';
        activeApprovalRequestId = null;
        expandedApprovalActionId = null;
        activeApprovalDecision = null;
        renderApprovalListPage();
    };

    window.openApprovalRequestDetail = function(requestId) {
        approvalListView = 'detail';
        activeApprovalRequestId = requestId;
        expandedApprovalActionId = null;
        activeApprovalDecision = null;
        renderApprovalListPage();
    };

    window.renderApprovalListPage = function() {
        approvalListView = 'list';
        activeApprovalRequestId = null;
        renderApprovalListPage();
    };

    window.toggleApprovalActionMenu = function(requestId) {
        const isClosing = expandedApprovalActionId === requestId;
        expandedApprovalActionId = isClosing ? null : requestId;
        activeApprovalDecision = null;

        if (approvalListView === 'detail' && activeApprovalRequestId === requestId) {
            renderApprovalListPage();
            return;
        }

        approvalListView = 'list';
        activeApprovalRequestId = null;
        renderApprovalListPage();
    };

    window.selectApprovalDecision = function(requestId, decision) {
        expandedApprovalActionId = requestId;
        activeApprovalDecision = decision;

        if (approvalListView === 'detail' && activeApprovalRequestId === requestId) {
            renderApprovalListPage();
            return;
        }

        approvalListView = 'list';
        activeApprovalRequestId = null;
        renderApprovalListPage();
    };

    window.submitApprovalDecision = function(requestId) {
        if (!activeApprovalDecision) {
            alert('Please select Approve or Reject first.');
            return;
        }

        window.takeApprovalAction(requestId, activeApprovalDecision);
    };

    window.takeApprovalAction = function(requestId, decision) {
        const request = getApprovalRequestById(requestId);
        if (!request) return;

        const notesField = document.getElementById(`approval-review-notes-${requestId}`);
        const reviewNotes = notesField ? notesField.value.trim() : '';

        if (decision === 'rejected' && !reviewNotes) {
            alert('Review notes are required when rejecting an approval request.');
            if (notesField) notesField.focus();
            return;
        }

        request.status = decision;
        request.levelLabel = 'Completed';
        request.notes = reviewNotes || (
            decision === 'approved'
                ? `${request.notes} Approved by current approver.`
                : `${request.notes} Rejected by current approver.`
        );
        expandedApprovalActionId = null;
        activeApprovalDecision = null;

        if (approvalListView === 'detail' && activeApprovalRequestId === requestId) {
            renderApprovalListPage();
            return;
        }

        approvalListView = 'list';
        activeApprovalRequestId = null;
        renderApprovalListPage();
    };

    window.openApprovalRuleDetail = function(ruleId) {
        approvalRuleView = 'detail';
        activeApprovalRuleId = ruleId;
        renderApprovalRulesPage();
    };

    window.createApprovalRule = function() {
        approvalRuleView = 'form';
        activeApprovalRuleId = null;
        approvalRuleFormLevels = 1;
        renderApprovalRulesPage();
    };

    window.editApprovalRule = function(ruleId) {
        approvalRuleView = 'form';
        activeApprovalRuleId = ruleId;
        approvalRuleFormLevels = getApprovalRuleLevelCount(getApprovalRuleById(ruleId));
        renderApprovalRulesPage();
    };

    window.addApprovalFlowLevel = function() {
        if (approvalRuleFormLevels >= 3) return;
        approvalRuleFormLevels += 1;

        const nextLevel = document.getElementById(`approval-rule-level-${approvalRuleFormLevels}`);
        if (nextLevel) nextLevel.style.display = 'flex';

        const addButton = document.getElementById('approval-rule-add-level-btn');
        const removeButton = document.getElementById('approval-rule-remove-level-btn');
        if (addButton) addButton.style.display = approvalRuleFormLevels >= 3 ? 'none' : 'inline-flex';
        if (removeButton) removeButton.style.display = approvalRuleFormLevels > 1 ? 'inline-flex' : 'none';
    };

    window.removeApprovalFlowLevel = function() {
        if (approvalRuleFormLevels <= 1) return;

        const currentSelect = document.getElementById(`approval-rule-approver-${approvalRuleFormLevels}`);
        const currentLevel = document.getElementById(`approval-rule-level-${approvalRuleFormLevels}`);
        if (currentSelect) currentSelect.value = '';
        if (currentLevel) currentLevel.style.display = 'none';

        approvalRuleFormLevels -= 1;

        const addButton = document.getElementById('approval-rule-add-level-btn');
        const removeButton = document.getElementById('approval-rule-remove-level-btn');
        if (addButton) addButton.style.display = approvalRuleFormLevels >= 3 ? 'none' : 'inline-flex';
        if (removeButton) removeButton.style.display = approvalRuleFormLevels > 1 ? 'inline-flex' : 'none';
    };

    window.toggleApprovalRuleStatus = function(ruleId) {
        const rule = getApprovalRuleById(ruleId);
        if (!rule) return;
        rule.status = rule.status === 'enabled' ? 'disabled' : 'enabled';
        rule.updatedAt = 'Just now';
        renderApprovalRulesPage();
    };

    window.deleteApprovalRule = function(ruleId) {
        const index = approvalRules.findIndex(rule => rule.id === ruleId);
        if (index === -1) return;
        if (!confirm('Are you sure you want to delete this approval rule?')) return;
        approvalRules.splice(index, 1);
        approvalRuleView = 'list';
        activeApprovalRuleId = null;
        renderApprovalRulesPage();
    };

    window.saveApprovalRule = function(ruleId) {
        const name = document.getElementById('approval-rule-name').value.trim();
        const scope = document.getElementById('approval-rule-scope').value;
        const triggerOperator = document.getElementById('approval-rule-trigger-operator').value;
        const triggerValue = document.getElementById('approval-rule-trigger-value').value.trim();
        const approverLevel1 = document.getElementById('approval-rule-approver-1').value;
        const approverLevel2 = document.getElementById('approval-rule-approver-2').value;
        const approverLevel3 = document.getElementById('approval-rule-approver-3').value;
        const notes = document.getElementById('approval-rule-notes').value.trim();

        if (!name || !scope || !triggerOperator || !triggerValue || !approverLevel1) {
            alert('Please complete all required approval rule fields.');
            return;
        }

        if (ruleId) {
            const rule = getApprovalRuleById(ruleId);
            if (!rule) return;
            rule.name = name;
            rule.scope = scope;
            rule.triggerOperator = triggerOperator;
            rule.triggerValue = triggerValue;
            rule.approverLevel1 = approverLevel1;
            rule.approverLevel2 = approverLevel2;
            rule.approverLevel3 = approverLevel3;
            rule.notes = notes || 'No notes provided.';
            rule.updatedAt = 'Just now';
            approvalRuleView = 'detail';
            activeApprovalRuleId = ruleId;
        } else {
            const newRuleId = `AR-${String(approvalRules.length + 1).padStart(3, '0')}`;
            approvalRules.unshift({
                id: newRuleId,
                name,
                scope,
                triggerOperator,
                triggerValue,
                approverLevel1,
                approverLevel2,
                approverLevel3,
                updatedAt: 'Just now',
                status: 'enabled',
                notes: notes || 'No notes provided.'
            });
            approvalRuleView = 'detail';
            activeApprovalRuleId = newRuleId;
        }

        renderApprovalRulesPage();
    };


    window.switchToAddAddressView = function() {
        // Reset forms
        document.getElementById('na-form-individual').style.display = 'flex';
        document.getElementById('na-form-organization').style.display = 'none';
        const ownerRadios = document.querySelectorAll('input[name="newAddrOwnerType"]');
        if(ownerRadios[0]) ownerRadios[0].checked = true;
        
        const methodRadios = document.querySelectorAll('input[name="newAddrMethod"]');
        if(methodRadios[0]) methodRadios[0].checked = true;
        document.getElementById('na-custodial-input').style.display = 'none';
        
        document.getElementById('addr-list-view').style.display = 'none';
        document.getElementById('add-addr-view').style.display = 'flex';
    };

    window.switchToListAddressView = function() {
        document.getElementById('addr-list-view').style.display = 'flex';
        document.getElementById('add-addr-view').style.display = 'none';
    };

    window.toggleNewAddrOwnerType = function(type) {
        if (type === 'individual') {
            document.getElementById('na-form-individual').style.display = 'flex';
            document.getElementById('na-form-organization').style.display = 'none';
        } else {
            document.getElementById('na-form-individual').style.display = 'none';
            document.getElementById('na-form-organization').style.display = 'flex';
        }
    };

    window.selectNewAddrMethod = function(method) {
        if (method === 'custodial') {
            document.getElementById('na-custodial-input').style.display = 'flex';
        } else {
            document.getElementById('na-custodial-input').style.display = 'none';
        }
    };

    window.toggleAddressStatus = function(btn) {
        if (btn.classList.contains('enabled')) {
            btn.classList.remove('enabled');
            btn.classList.add('disabled');
            btn.textContent = 'Disabled';
            btn.style.background = '#F1F5F9';
            btn.style.color = '#64748B';
            btn.style.borderColor = '#CBD5E1';
            btn.closest('.addr-item').style.opacity = '0.6';
        } else {
            btn.classList.remove('disabled');
            btn.classList.add('enabled');
            btn.textContent = 'Enabled';
            btn.style.background = '#D1FAE5';
            btn.style.color = '#059669';
            btn.style.borderColor = '#10B981';
            btn.closest('.addr-item').style.opacity = '1';
        }
    };

    window.deleteAddress = function(btn) {
        if(confirm("Are you sure you want to delete this address?")) {
            btn.closest('.addr-item').remove();
        }
    };

    window.submitNewAddress = function() {
        const isIndividual = document.querySelector('input[name="newAddrOwnerType"][value="individual"]').checked;
        const method = document.querySelector('input[name="newAddrMethod"]:checked').value;
        
        let name = isIndividual ? 
            ((document.getElementById('na-fname').value || 'New') + ' ' + (document.getElementById('na-lname').value || 'User')) : 
            (document.getElementById('na-orgname').value || 'New Organization');
            
        let network = 'ETH';
        let addr = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
        
        if (method === 'custodial') {
            addr = document.getElementById('na-wallet-addr').value || addr;
            network = document.getElementById('na-wallet-net').value || 'ETH';
        } else {
            network = (Math.random() > 0.5) ? 'ETH' : 'TRON';
        }
        
        const shortAddr = addr.substring(0,21) + '...' + addr.substring(addr.length-4);
        
        const newHtml = `
        <div class="addr-item" style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; background: #FFF; display: flex; align-items: center; justify-content: space-between;">
            <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <div style="font-weight: 600; font-size: 14px; color: #0F172A;">${name}</div>
                    <span style="background: #F1F5F9; color: #475569; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${network}</span>
                </div>
                <div style="font-family: monospace; font-size: 12px; color: #64748B;">${shortAddr}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <button onclick="window.toggleAddressStatus(this)" class="addr-toggle enabled" style="padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid #10B981; background: #D1FAE5; color: #059669; cursor: pointer;">Enabled</button>
                <button onclick="window.deleteAddress(this)" style="background: none; border: none; cursor: pointer; color: #94A3B8;"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
            </div>
        </div>`;
        
        document.getElementById('addr-list-container').insertAdjacentHTML('beforeend', newHtml);
        lucide.createIcons();
        alert('Address verified and added successfully.');
        window.switchToListAddressView();
    };

    // Constant HTML for Overview Page
    const overviewHTML = `
        <div class="overview-grid fade-in">
            <!-- Main Column -->
            <div class="overview-main">
                <!-- Unified Assets Card -->
                <div class="card unified-assets-card" style="padding: 0; overflow: hidden;">
                    <!-- At a Glance Section -->
                    <div class="summary-section" style="padding: 24px; border-bottom: 1px solid var(--clr-border);">
                        <h2 class="card-title">At a Glance</h2>
                        <div class="summary-content">
                            <div class="balance-section">
                                <span class="label">Total Availables</span>
                                <h3 class="balance-amount">$1,234,567.89 <span class="currency">USD</span></h3>
                            </div>
                            <div class="action-buttons">
                                <button class="btn btn-primary"><i data-lucide="plus"></i> Top Up</button>
                                <button class="btn btn-outline"><i data-lucide="send"></i> Transfer</button>
                                <button class="btn btn-outline"><i data-lucide="refresh-cw"></i> Convert</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Stablecoin & Fiat Area -->
                    <div class="asset-grid" style="padding: 24px;">
                        <div class="asset-card-inner">
                            <div class="asset-header">
                                <h2 class="card-title">Stablecoins</h2>
                                <span class="asset-total">≈ $450,000.00 USD</span>
                            </div>
                            <div class="asset-list">
                                <div class="asset-item">
                                    <div class="asset-info">
                                        <div class="asset-icon usdt">₮</div>
                                        <span class="asset-name">USDT</span>
                                    </div>
                                    <span class="asset-balance">250,000.00</span>
                                </div>
                                <div class="asset-item">
                                    <div class="asset-info">
                                        <div class="asset-icon usdc">C</div>
                                        <span class="asset-name">USDC</span>
                                    </div>
                                    <span class="asset-balance">200,000.00</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="asset-card-inner">
                            <div class="asset-header">
                                <h2 class="card-title">Fiat</h2>
                                <span class="asset-total">≈ $784,567.89 USD</span>
                            </div>
                            <div class="asset-list">
                                <div class="asset-item">
                                    <div class="asset-info">
                                        <div class="asset-icon usd">$</div>
                                        <span class="asset-name">USD</span>
                                    </div>
                                    <span class="asset-balance">500,000.00</span>
                                </div>
                                <div class="asset-item">
                                    <div class="asset-info">
                                        <div class="asset-icon hkd">HK$</div>
                                        <span class="asset-name">HKD</span>
                                    </div>
                                    <span class="asset-balance">1,500,000.00</span>
                                </div>
                                <div class="asset-item">
                                    <div class="asset-info">
                                        <div class="asset-icon eur">€</div>
                                        <span class="asset-name">EUR</span>
                                    </div>
                                    <span class="asset-balance">85,000.00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Fund Flow -->
                <div class="card fund-flow-card">
                    <div class="fund-flow-header">
                        <h2 class="card-title" style="margin-bottom: 0;">Fund Flow</h2>
                        <div class="time-selector">
                            <span class="time-option">1d</span>
                            <span class="time-option">1w</span>
                            <span class="time-option active">1m</span>
                            <span class="time-option">6m</span>
                            <span class="time-option">1y</span>
                        </div>
                    </div>
                    <div class="fund-flow-body">
                        <div class="fund-flow-chart">
                            <!-- Chart.js Canvas -->
                            <canvas id="fundFlowChart" height="200"></canvas>
                        </div>
                        <div class="fund-flow-stats">
                            <div class="stat-group">
                                <div class="stat-label"><i data-lucide="arrow-down-left" style="color: #10B981;"></i> Total Inbound</div>
                                <div class="stat-value text-success">+$2,456,120.00</div>
                                <div class="stat-currency">USD equivalent</div>
                            </div>
                            <div class="stat-group">
                                <div class="stat-label"><i data-lucide="arrow-up-right" style="color: #64748B;"></i> Total Outbound</div>
                                <div class="stat-value">- $1,200,500.00</div>
                                <div class="stat-currency">USD equivalent</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Collections Summary -->
                <div class="card collections-summary-card">
                    <h2 class="card-title" style="font-size: 18px; margin-bottom: 24px;">Collections Summary</h2>
                    <div class="collection-cards-wrapper" style="gap: 32px; display: flex; flex-direction: column;">
                        <!-- Invoice Orders -->
                        <div class="collection-card-inner">
                            <div class="collection-header">
                                <h3 class="card-title" style="margin-bottom: 0; font-size: 15px;">Invoice Orders</h3>
                                <div class="time-selector">
                                    <span class="time-option">1d</span>
                                    <span class="time-option">1w</span>
                                    <span class="time-option active">1m</span>
                                    <span class="time-option">6m</span>
                                    <span class="time-option">1y</span>
                                </div>
                            </div>
                            <div class="collection-stats-grid">
                                <div class="c-stat-box">
                                    <span class="c-stat-label">Created Orders</span>
                                    <span class="c-stat-count">1,240</span>
                                    <span class="c-stat-amount">$450,200.00</span>
                                </div>
                                <div class="c-stat-box">
                                    <span class="c-stat-label">Paid Successfully</span>
                                    <span class="c-stat-count text-success">1,100</span>
                                    <span class="c-stat-amount text-success">$405,000.00</span>
                                </div>
                                <div class="c-stat-box">
                                    <span class="c-stat-label">In-Transit (incl. Underpaid)</span>
                                    <span class="c-stat-count text-warning">85</span>
                                    <span class="c-stat-amount text-warning">$25,200.00</span>
                                </div>
                                <div class="c-stat-box">
                                    <span class="c-stat-label">Failed (Expired/Cancelled)</span>
                                    <span class="c-stat-count text-muted">55</span>
                                    <span class="c-stat-amount text-muted">$20,000.00</span>
                                </div>
                            </div>
                        </div>
                        
                        <div style="height: 1px; background-color: var(--clr-border);"></div>

                        <!-- Checkout Orders -->
                        <div class="collection-card-inner">
                            <div class="collection-header">
                                <h3 class="card-title" style="margin-bottom: 0; font-size: 15px;">Checkout Orders</h3>
                                <div class="time-selector">
                                    <span class="time-option">1d</span>
                                    <span class="time-option">1w</span>
                                    <span class="time-option active">1m</span>
                                    <span class="time-option">6m</span>
                                    <span class="time-option">1y</span>
                                </div>
                            </div>
                            <div class="collection-stats-grid">
                                <div class="c-stat-box">
                                    <span class="c-stat-label">Created Orders</span>
                                    <span class="c-stat-count">8,520</span>
                                    <span class="c-stat-amount">$1,205,500.00</span>
                                </div>
                                <div class="c-stat-box">
                                    <span class="c-stat-label">Paid Successfully</span>
                                    <span class="c-stat-count text-success">7,800</span>
                                    <span class="c-stat-amount text-success">$1,080,000.00</span>
                                </div>
                                <div class="c-stat-box">
                                    <span class="c-stat-label">In-Transit (incl. Underpaid)</span>
                                    <span class="c-stat-count text-warning">420</span>
                                    <span class="c-stat-amount text-warning">$80,500.00</span>
                                </div>
                                <div class="c-stat-box">
                                    <span class="c-stat-label">Failed (Expired/Cancelled)</span>
                                    <span class="c-stat-count text-muted">300</span>
                                    <span class="c-stat-amount text-muted">$45,000.00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Payouts Summary -->
                <div class="card payouts-summary-card">
                    <h2 class="card-title" style="font-size: 18px; margin-bottom: 24px;">Payouts Summary</h2>
                    <div class="collection-card-inner">
                        <div class="collection-header">
                            <h3 class="card-title" style="margin-bottom: 0; font-size: 15px;">Payout Orders</h3>
                            <div class="time-selector">
                                <span class="time-option">1d</span>
                                <span class="time-option">1w</span>
                                <span class="time-option active">1m</span>
                                <span class="time-option">6m</span>
                                <span class="time-option">1y</span>
                            </div>
                        </div>
                        <div class="collection-stats-grid">
                            <div class="c-stat-box">
                                <span class="c-stat-label">Created Orders</span>
                                <span class="c-stat-count">350</span>
                                <span class="c-stat-amount">$2,550,000.00</span>
                            </div>
                            <div class="c-stat-box">
                                <span class="c-stat-label">Successful</span>
                                <span class="c-stat-count text-success">310</span>
                                <span class="c-stat-amount text-success">$2,400,000.00</span>
                            </div>
                            <div class="c-stat-box">
                                <span class="c-stat-label">Settled</span>
                                <span class="c-stat-count" style="color: #3B82F6;">290</span>
                                <span class="c-stat-amount" style="color: #3B82F6;">$2,250,000.00</span>
                            </div>
                            <div class="c-stat-box">
                                <span class="c-stat-label">In-Transit</span>
                                <span class="c-stat-count text-warning">25</span>
                                <span class="c-stat-amount text-warning">$100,000.00</span>
                            </div>
                            <div class="c-stat-box">
                                <span class="c-stat-label">Failed</span>
                                <span class="c-stat-count text-muted">15</span>
                                <span class="c-stat-amount text-muted">$50,000.00</span>
                            </div>
                        </div>
                    </div>
                </div>



            </div>
            
            <!-- Secondary Column -->
            <div class="overview-sidebar">
                <div class="card activities-card">
                    <div class="card-header-flex">
                        <h2 class="card-title" style="margin-bottom: 0;">Activities</h2>
                        <a href="#" class="view-all-link">View All</a>
                    </div>
                    <div class="activity-feed">
                        <!-- Activity Item 1 -->
                        <div class="activity-item" style="align-items: center;">
                            <div class="activity-icon bg-warning">
                                <i data-lucide="clock"></i>
                            </div>
                            <div class="activity-content">
                                <p class="activity-text">Stablecoin withdrawal pending</p>
                                <span class="activity-time">Just now</span>
                            </div>
                            <div class="activity-actions">
                                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; white-space: nowrap;" onclick="alert('Checking Approval Tasks...');">Review</button>
                            </div>
                        </div>

                        <!-- Activity Item 2 -->
                        <div class="activity-item" style="align-items: center;">
                            <div class="activity-icon bg-success">
                                <i data-lucide="arrow-down"></i>
                            </div>
                            <div class="activity-content">
                                <div class="activity-text-row">
                                    <p class="activity-text">Received Checkout payment</p>
                                    <span class="activity-amount text-success">+1,000 USDT</span>
                                </div>
                                <span class="activity-time">2 hours ago</span>
                            </div>
                            <div class="activity-actions">
                                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; white-space: nowrap;" onclick="alert('Navigating to Order Details...');">View Tx</button>
                            </div>
                        </div>

                        <!-- Activity Item 3 -->
                        <div class="activity-item" style="align-items: center;">
                            <div class="activity-icon bg-info">
                                <i data-lucide="user-plus"></i>
                            </div>
                            <div class="activity-content">
                                <p class="activity-text">New member <strong>Alex</strong> joined</p>
                                <span class="activity-time">Yesterday</span>
                            </div>
                            <div class="activity-actions">
                                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; white-space: nowrap;" onclick="alert('Manage User Roles...');">Manage</button>
                            </div>
                        </div>

                        <!-- Activity Item 4 -->
                        <div class="activity-item" style="align-items: center;">
                            <div class="activity-icon bg-slate">
                                <i data-lucide="arrow-up-right"></i>
                            </div>
                            <div class="activity-content">
                                <div class="activity-text-row">
                                    <p class="activity-text">Payment to supplier successful</p>
                                    <span class="activity-amount">-20,000 HKD</span>
                                </div>
                                <span class="activity-time">Feb 14, 2026</span>
                            </div>
                            <div class="activity-actions">
                                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; white-space: nowrap;" onclick="alert('Downloading Receipt...');">Receipt</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Approvals Card -->
                <div class="card approvals-card" style="margin-top: 24px;">
                    <div class="card-header-flex">
                        <h2 class="card-title" style="margin-bottom: 0;">Pending Approvals</h2>
                        <span class="badge" style="background-color: #EF4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">3 Tasks</span>
                    </div>
                    <div class="approval-list" style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
                        
                        <!-- Task 1 -->
                        <div class="approval-item" style="padding: 16px; border: 1px solid var(--clr-border); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                <div>
                                    <div style="font-weight: 600; color: var(--clr-text-main); font-size: 14px;">Payout Request</div>
                                    <div style="color: var(--clr-text-muted); font-size: 13px; margin-top: 4px;">Global Tech Ltd &bull; 10 mins ago</div>
                                </div>
                                <div style="color: var(--clr-text-main); font-weight: 600; font-size: 14px;">$15,000.00</div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-outline" style="flex: 1; padding: 6px 0; font-size: 13px;">Details</button>
                                <button class="btn btn-primary" style="flex: 1; padding: 6px 0; font-size: 13px;">Approve</button>
                            </div>
                        </div>
                        
                        <!-- Task 2 -->
                        <div class="approval-item" style="padding: 16px; border: 1px solid var(--clr-border); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                <div>
                                    <div style="font-weight: 600; color: var(--clr-text-main); font-size: 14px;">Asset Withdrawal</div>
                                    <div style="color: var(--clr-text-muted); font-size: 13px; margin-top: 4px;">Wallet ending in 8xF4 &bull; 2 hrs ago</div>
                                </div>
                                <div style="color: var(--clr-text-main); font-weight: 600; font-size: 14px;">10,000 USDT</div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-outline" style="flex: 1; padding: 6px 0; font-size: 13px;">Details</button>
                                <button class="btn btn-primary" style="flex: 1; padding: 6px 0; font-size: 13px;">Approve</button>
                            </div>
                        </div>

                        <!-- Task 3 -->
                        <div class="approval-item" style="padding: 16px; border: 1px solid var(--clr-border); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                <div>
                                    <div style="font-weight: 600; color: var(--clr-text-main); font-size: 14px;">Payout Request</div>
                                    <div style="color: var(--clr-text-muted); font-size: 13px; margin-top: 4px;">Cloud Services Inc &bull; Yesterday</div>
                                </div>
                                <div style="color: var(--clr-text-main); font-weight: 600; font-size: 14px;">$30,000.00</div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-outline" style="flex: 1; padding: 6px 0; font-size: 13px;">Details</button>
                                <button class="btn btn-primary" style="flex: 1; padding: 6px 0; font-size: 13px;">Approve</button>
                            </div>
                        </div>
                        
                    </div>
                </div>

                <!-- Ad Banner -->
                <div class="ad-banner fade-in" style="margin-top: 24px; border-radius: 12px; overflow: hidden; position: relative; aspect-ratio: 1 / 1;">
                    <img src="banner_bg.png" alt="Building Background" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(15,23,42,0.1), rgba(15,23,42,0.85)); pointer-events: none;"></div>
                    <div style="position: absolute; bottom: 20px; left: 20px; right: 20px; color: white;">
                        <p style="font-size: 11px; font-weight: 600; letter-spacing: 1px; margin-bottom: 6px; opacity: 0.9; text-transform: uppercase;">Global Expansion</p>
                        <h3 style="font-size: 19px; font-weight: 600; margin-bottom: 12px; line-height: 1.3;">Seamless Multi-<br>Currency Settlement</h3>
                        <a href="#" style="color: white; font-size: 14px; text-decoration: none; display: flex; align-items: center; gap: 4px; font-weight: 500; transition: opacity 0.2s;">
                            Explore Local accounts <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
                        </a>
                    </div>
                </div>

            </div>

            <!-- Recent Orders (Full Width) -->
            <div class="card recent-orders-card" style="grid-column: 1 / -1; margin-top: 0;">
                <div class="card-header-flex">
                    <h2 class="card-title" style="margin-bottom: 0;">Recent Orders</h2>
                    <a href="#" class="view-all-link">View All</a>
                </div>
                <div class="table-responsive" style="margin-top: 16px;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Created At</th>
                                <th>Product Type</th>
                                <th>Details</th>
                                <th class="text-right">Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Row 1 -->
                            <tr onclick="alert('Navigating to Order Details...')">
                                <td class="text-muted">Today, 14:30</td>
                                <td>Collection-Invoice</td>
                                <td class="font-medium">Invoice to Global Tech Ltd</td>
                                <td class="text-right font-medium text-success">+ $45,000.00 <span class="currency">USD</span></td>
                                <td><span class="status-badge status-success">Completed</span></td>
                            </tr>
                            <!-- Row 2 -->
                            <tr onclick="alert('Navigating to Order Details...')">
                                <td class="text-muted">Today, 11:15</td>
                                <td>Vault-Transfer</td>
                                <td class="font-medium">Internal Transfer to USD Vault</td>
                                <td class="text-right font-medium">- 10,000.00 <span class="currency">USDT</span></td>
                                <td><span class="status-badge status-warning">Processing</span></td>
                            </tr>
                            <!-- Row 3 -->
                            <tr onclick="alert('Navigating to Order Details...')">
                                <td class="text-muted">Yesterday, 09:45</td>
                                <td>Conversion</td>
                                <td class="font-medium">Convert EUR to USD</td>
                                <td class="text-right font-medium text-success">+ $50,000.00 <span class="currency">USD</span></td>
                                <td><span class="status-badge status-success">Completed</span></td>
                            </tr>
                            <!-- Row 4 -->
                            <tr onclick="alert('Navigating to Order Details...')">
                                <td class="text-muted">Oct 24, 16:20</td>
                                <td>Collection-Checkout</td>
                                <td class="font-medium">Payment from Customer A</td>
                                <td class="text-right font-medium text-success">+ €1,200.00 <span class="currency">EUR</span></td>
                                <td><span class="status-badge status-success">Completed</span></td>
                            </tr>
                            <!-- Row 5 -->
                            <tr onclick="alert('Navigating to Order Details...')">
                                <td class="text-muted">Oct 23, 10:00</td>
                                <td>Vault-Topup</td>
                                <td class="font-medium">Bank Wire Deposit</td>
                                <td class="text-right font-medium text-success">+ $100,000.00 <span class="currency">USD</span></td>
                                <td><span class="status-badge status-failed">Failed</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Constant HTML for Fiat Vault
    const fiatVaultHTML = `
        <div class="fade-in" style="display: flex; flex-direction: column; gap: 32px;">

            <!-- Total Availables header + 4 currency rows -->
            <div class="card" style="padding: 0; overflow: hidden;">
                <div style="padding: 28px 32px; background: linear-gradient(135deg, #1E293B, #0F172A); color: white; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #94A3B8; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Total Availables</div>
                        <div style="font-size: 36px; font-weight: 700;">$3,482,150.00 <span style="font-size: 16px; font-weight: 400; color: #94A3B8;">USD Equiv.</span></div>
                    </div>
                    <div style="color: #10B981; font-size: 14px; font-weight: 500; background: rgba(16,185,129,0.1); padding: 6px 14px; border-radius: 20px;">+ $8,400.00 Today</div>
                </div>
                <!-- USD -->
                <div style="padding: 20px 32px; border-bottom: 1px solid var(--clr-border); display: flex; align-items: center; gap: 24px;">
                    <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #2563EB; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 13px; flex-shrink: 0;">USD</div>
                        <div><div style="font-size: 15px; font-weight: 600; color: var(--clr-text-main);">US Dollar</div><div style="font-size: 13px; color: var(--clr-text-muted);">United States Dollar</div></div>
                    </div>
                    <div style="font-size: 22px; font-weight: 600; color: var(--clr-text-main); flex: 1;">1,500,000.00 <span style="font-size: 13px; color: var(--clr-text-muted); font-weight: 400;">USD</span></div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" style="font-size: 13px; padding: 8px 20px;" onclick="window.openFiatTopUpDrawer('USD')">Top Up</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="alert('Transfer USD')">Transfer</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="window.openConvertDrawer('USD')">Convert</button>
                    </div>
                </div>
                <!-- HKD -->
                <div style="padding: 20px 32px; border-bottom: 1px solid var(--clr-border); display: flex; align-items: center; gap: 24px;">
                    <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #DC2626; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 13px; flex-shrink: 0;">HKD</div>
                        <div><div style="font-size: 15px; font-weight: 600; color: var(--clr-text-main);">HK Dollar</div><div style="font-size: 13px; color: var(--clr-text-muted);">Hong Kong Dollar</div></div>
                    </div>
                    <div style="font-size: 22px; font-weight: 600; color: var(--clr-text-main); flex: 1;">8,200,000.00 <span style="font-size: 13px; color: var(--clr-text-muted); font-weight: 400;">HKD</span></div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" style="font-size: 13px; padding: 8px 20px;" onclick="window.openFiatTopUpDrawer('HKD')">Top Up</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="alert('Transfer HKD')">Transfer</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="window.openConvertDrawer('HKD')">Convert</button>
                    </div>
                </div>
                <!-- EUR -->
                <div style="padding: 20px 32px; border-bottom: 1px solid var(--clr-border); display: flex; align-items: center; gap: 24px;">
                    <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #7C3AED; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 13px; flex-shrink: 0;">EUR</div>
                        <div><div style="font-size: 15px; font-weight: 600; color: var(--clr-text-main);">Euro</div><div style="font-size: 13px; color: var(--clr-text-muted);">European Euro</div></div>
                    </div>
                    <div style="font-size: 22px; font-weight: 600; color: var(--clr-text-main); flex: 1;">320,000.00 <span style="font-size: 13px; color: var(--clr-text-muted); font-weight: 400;">EUR</span></div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" style="font-size: 13px; padding: 8px 20px;" onclick="window.openFiatTopUpDrawer('EUR')">Top Up</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="alert('Transfer EUR')">Transfer</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="window.openConvertDrawer('EUR')">Convert</button>
                    </div>
                </div>
                <!-- BRL -->
                <div style="padding: 20px 32px; display: flex; align-items: center; gap: 24px;">
                    <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #059669; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 13px; flex-shrink: 0;">BRL</div>
                        <div><div style="font-size: 15px; font-weight: 600; color: var(--clr-text-main);">Brazilian Real</div><div style="font-size: 13px; color: var(--clr-text-muted);">Brazil Real</div></div>
                    </div>
                    <div style="font-size: 22px; font-weight: 600; color: var(--clr-text-main); flex: 1;">980,000.00 <span style="font-size: 13px; color: var(--clr-text-muted); font-weight: 400;">BRL</span></div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" style="font-size: 13px; padding: 8px 20px;" onclick="window.openFiatTopUpDrawer('BRL')">Top Up</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="alert('Transfer BRL')">Transfer</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="window.openConvertDrawer('BRL')">Convert</button>
                    </div>
                </div>
            </div>

            <!-- Important Notices -->
            <div class="card" style="border: 1px solid #E2E8F0;" id="fiat-notices-card">
                <div class="card-header-flex" style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 8px; background-color: #FEE2E2; display: flex; align-items: center; justify-content: center;">
                            <i data-lucide="alert-triangle" style="width: 16px; height: 16px; color: #DC2626;"></i>
                        </div>
                        <h2 class="card-title" style="margin-bottom: 0;">重要通知</h2>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;" id="fiat-notices-list">
                    <div style="background: #FFFBFB; border: 1px solid #FECACA; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <span style="background-color: #FEE2E2; color: #DC2626; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">ON HOLD</span>
                                <span style="font-weight: 600; font-size: 14px; color: #1E293B;">Inbound USD — 200,000.00</span>
                            </div>
                            <p style="font-size: 13px; color: #64748B; margin: 0 0 10px 0; line-height: 1.6;">This inbound wire transfer is currently pending verification. Please await further instructions from the Obita operations team via your registered email.</p>
                            <div style="display: flex; gap: 20px; font-size: 12px; color: #94A3B8;">
                                <span><strong style="color: #475569;">Order ID:</strong> FV-20261025-0012</span>
                                <span><strong style="color: #475569;">Time:</strong> Today, 10:15</span>
                            </div>
                        </div>
                        <button onclick="this.closest('div[style*=border-radius]').remove(); const list=document.getElementById('fiat-notices-list'); if(!list.children.length) document.getElementById('fiat-notices-card').style.display='none';" style="flex-shrink:0; background:none; border:1px solid #E2E8F0; border-radius:6px; padding:4px 10px; font-size:12px; color:#64748B; cursor:pointer; transition: all 0.2s;">Dismiss</button>
                    </div>
                </div>
            </div>

            <!-- Connected Bank Accounts -->
            <div class="card">
                <div class="card-header-flex">
                    <h2 class="card-title" style="margin-bottom: 0;">Connected Bank Accounts</h2>
                    <a href="#" class="view-all-link" onclick="window.openManageBankAccountsDrawer(); return false;">Manage Accounts</a>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0; margin-top: 16px;">
                    <!-- Chase: USD -->
                    <div class="wallet-card" style="border-radius:0; border-left:none; border-right:none; border-top:none; border-bottom: 1px solid var(--clr-border); padding: 16px 0;" onclick="alert('Chase Bank transactions...')">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="padding: 8px; background-color: #EFF6FF; border-radius: 8px; border: 1px solid #BFDBFE; flex-shrink: 0;"><i data-lucide="landmark" style="color: #2563EB; width: 18px; height: 18px;"></i></div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
                                    <span style="font-weight: 600; font-size: 14px; color: var(--clr-text-main);">Chase Bank — Corporate Account</span>
                                    <span style="background-color: #DBEAFE; color: #1D4ED8; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">USD</span>
                                    <span style="background-color: #D1FAE5; color: #059669; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">Top Up</span>
                                </div>
                                <div style="font-size: 12px; color: var(--clr-text-muted);">Account: •••• 4821 &nbsp;|&nbsp; Routing: 021000021 &nbsp;|&nbsp; SWIFT: CHASUS33</div>
                            </div>
                            <div style="font-size: 12px; color: var(--clr-text-muted); flex-shrink: 0;">Last used: Today</div>
                        </div>
                    </div>
                    <!-- HSBC: HKD -->
                    <div class="wallet-card" style="border-radius:0; border-left:none; border-right:none; border-top:none; border-bottom: 1px solid var(--clr-border); padding: 16px 0;" onclick="alert('HSBC transactions...')">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="padding: 8px; background-color: #FEF2F2; border-radius: 8px; border: 1px solid #FECACA; flex-shrink: 0;"><i data-lucide="landmark" style="color: #DC2626; width: 18px; height: 18px;"></i></div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
                                    <span style="font-weight: 600; font-size: 14px; color: var(--clr-text-main);">HSBC Hong Kong — Operating</span>
                                    <span style="background-color: #FEE2E2; color: #DC2626; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">HKD</span>
                                    <span style="background-color: #FEF3C7; color: #D97706; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">Transfer</span>
                                </div>
                                <div style="font-size: 12px; color: var(--clr-text-muted);">Account: •••• 9230 &nbsp;|&nbsp; Bank Code: 004 &nbsp;|&nbsp; SWIFT: HSBCHKHHHKH</div>
                            </div>
                            <div style="font-size: 12px; color: var(--clr-text-muted); flex-shrink: 0;">Last used: Yesterday</div>
                        </div>
                    </div>
                    <!-- Deutsche: EUR + USD -->
                    <div class="wallet-card" style="border-radius:0; border-left:none; border-right:none; border-top:none; border-bottom: none; padding: 16px 0;" onclick="alert('Deutsche Bank transactions...')">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="padding: 8px; background-color: #F5F3FF; border-radius: 8px; border: 1px solid #DDD6FE; flex-shrink: 0;"><i data-lucide="landmark" style="color: #7C3AED; width: 18px; height: 18px;"></i></div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
                                    <span style="font-weight: 600; font-size: 14px; color: var(--clr-text-main);">Deutsche Bank — Euro Settlement</span>
                                    <span style="background-color: #EDE9FE; color: #7C3AED; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">EUR</span>
                                    <span style="background-color: #DBEAFE; color: #1D4ED8; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">USD</span>
                                    <span style="background-color: #D1FAE5; color: #059669; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">Top Up</span>
                                </div>
                                <div style="font-size: 12px; color: var(--clr-text-muted);">IBAN: DE89 3704 0044 0532 0130 00 &nbsp;|&nbsp; SWIFT: DEUTDEDB</div>
                            </div>
                            <div style="font-size: 12px; color: var(--clr-text-muted); flex-shrink: 0;">Last used: Oct 23</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Vault Transactions Table -->
            <div class="card recent-orders-card">
                <div class="card-header-flex">
                    <h2 class="card-title" style="margin-bottom: 0;">Vault Transactions</h2>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px; display: flex; align-items: center; gap: 6px;"><i data-lucide="filter" style="width: 14px; height: 14px;"></i> Filters</button>
                        <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px; display: flex; align-items: center; gap: 6px;"><i data-lucide="download" style="width: 14px; height: 14px;"></i> Export</button>
                    </div>
                </div>
                <div class="table-responsive" style="margin-top: 16px;">
                    <table class="data-table">
                        <thead><tr><th>Time</th><th>Order ID</th><th>Type</th><th>From</th><th>To</th><th class="text-right">Amount</th><th>Status</th></tr></thead>
                        <tbody>
                            <tr onclick="alert('Viewing Order Details...')">
                                <td class="text-muted">Today, 11:30</td>
                                <td style="font-family: monospace; font-size: 12px; color: #2563EB;">FV-20261025-0031</td>
                                <td class="font-medium">Top Up</td>
                                <td style="font-size: 13px; color: var(--clr-text-muted);">Chase Bank ••4821</td>
                                <td style="font-size: 13px; color: var(--clr-text-muted);">Fiat Vault</td>
                                <td class="text-right font-medium text-success">+ 500,000.00 <span class="currency">USD</span></td>
                                <td><span class="status-badge status-success">Completed</span></td>
                            </tr>
                            <tr onclick="alert('Viewing Order Details...')">
                                <td class="text-muted">Yesterday, 15:20</td>
                                <td style="font-family: monospace; font-size: 12px; color: #2563EB;">FV-20261024-0019</td>
                                <td class="font-medium">Transfer</td>
                                <td style="font-size: 13px; color: var(--clr-text-muted);">Fiat Vault</td>
                                <td style="font-size: 13px; color: var(--clr-text-muted);">HSBC HK ••9230</td>
                                <td class="text-right font-medium">- 1,200,000.00 <span class="currency">HKD</span></td>
                                <td><span class="status-badge status-success">Completed</span></td>
                            </tr>
                            <tr onclick="alert('Viewing Order Details...')">
                                <td class="text-muted">Oct 23, 09:05</td>
                                <td style="font-family: monospace; font-size: 12px; color: #2563EB;">FV-20261023-0007</td>
                                <td class="font-medium">Top Up</td>
                                <td style="font-size: 13px; color: var(--clr-text-muted);">Deutsche Bank ••0130</td>
                                <td style="font-size: 13px; color: var(--clr-text-muted);">Fiat Vault</td>
                                <td class="text-right font-medium text-success">+ 100,000.00 <span class="currency">EUR</span></td>
                                <td><span class="status-badge status-warning" style="background-color: #FEF3C7; color: #D97706;">Confirming</span></td>
                            </tr>
                            <tr onclick="alert('Viewing Order Details...')">
                                <td class="text-muted">Oct 22, 14:00</td>
                                <td style="font-family: monospace; font-size: 12px; color: #2563EB;">FV-20261022-0003</td>
                                <td class="font-medium">Convert</td>
                                <td style="font-size: 13px; color: var(--clr-text-muted);">USD Balance</td>
                                <td style="font-size: 13px; color: var(--clr-text-muted);">BRL Balance</td>
                                <td class="text-right font-medium text-success">+ 980,000.00 <span class="currency">BRL</span></td>
                                <td><span class="status-badge status-success">Completed</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    `;

    // Constant HTML for Stablecoin Vault
    const stablecoinVaultHTML = `
        <div class="fade-in" style="display: flex; flex-direction: column; gap: 32px;">
            
            <!-- Top Section: Unified Asset Card -->
            <div class="card" style="padding: 0; overflow: hidden;">
                <!-- Total Availables Header -->
                <div style="padding: 28px 32px; background: linear-gradient(135deg, #1E293B, #0F172A); color: white; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #94A3B8; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Total Availables</div>
                        <div style="font-size: 36px; font-weight: 700;">$24,050,000.00 <span style="font-size: 16px; font-weight: 400; color: #94A3B8;">USD</span></div>
                    </div>
                    <div style="color: #10B981; font-size: 14px; font-weight: 500; background: rgba(16,185,129,0.1); padding: 6px 14px; border-radius: 20px;">+ $2,300.00 Today</div>
                </div>

                <!-- USDT Row -->
                <div style="padding: 24px 32px; border-bottom: 1px solid var(--clr-border); display: flex; align-items: center; gap: 24px;">
                    <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #26A17B; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 16px; flex-shrink: 0;">T</div>
                        <div>
                            <div style="font-size: 15px; font-weight: 600; color: var(--clr-text-main);">USDT</div>
                            <div style="font-size: 13px; color: var(--clr-text-muted);">Tether USD</div>
                        </div>
                    </div>
                    <div style="font-size: 22px; font-weight: 600; color: var(--clr-text-main); flex: 1;">14,000,000.00</div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" style="font-size: 13px; padding: 8px 20px;" onclick="openTopUpDrawer('USDT')">Top Up</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="window.openTransferDrawer('USDT')">Transfer</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="window.openConvertDrawer('USDT')">Convert</button>
                    </div>
                </div>

                <!-- USDC Row -->
                <div style="padding: 24px 32px; display: flex; align-items: center; gap: 24px;">
                    <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #2775CA; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 16px; flex-shrink: 0;">C</div>
                        <div>
                            <div style="font-size: 15px; font-weight: 600; color: var(--clr-text-main);">USDC</div>
                            <div style="font-size: 13px; color: var(--clr-text-muted);">USD Coin</div>
                        </div>
                    </div>
                    <div style="font-size: 22px; font-weight: 600; color: var(--clr-text-main); flex: 1;">10,050,000.00</div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" style="font-size: 13px; padding: 8px 20px;" onclick="openTopUpDrawer('USDC')">Top Up</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="window.openTransferDrawer('USDC')">Transfer</button>
                        <button class="btn btn-outline" style="font-size: 13px; padding: 8px 20px;" onclick="window.openConvertDrawer('USDC')">Convert</button>
                    </div>
                </div>
            </div>

            <!-- Important Notices Section -->
            <div class="card" style="border: 1px solid #E2E8F0;" id="sc-notices-card">
                <div class="card-header-flex" style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 8px; background-color: #FEE2E2; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i data-lucide="alert-triangle" style="width: 16px; height: 16px; color: #DC2626;"></i>
                        </div>
                        <h2 class="card-title" style="margin-bottom: 0;">重要通知</h2>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;" id="sc-notices-list">

                    <!-- Notice Item 1: Locked deposit -->
                    <div style="background: #FFFBFB; border: 1px solid #FECACA; border-radius: 10px; padding: 16px 20px; display: flex; flex-direction: column; gap: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <span style="background-color: #FEE2E2; color: #DC2626; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px;">LOCKED</span>
                                    <span style="font-weight: 600; font-size: 14px; color: #1E293B;">Inbound USDT — 40,000.00 is locked.</span>
                                </div>
                                <p style="font-size: 13px; color: #64748B; margin: 0 0 10px 0; line-height: 1.6;">Please complete the required information and wallet verification.</p>
                                <div style="display: flex; gap: 20px; font-size: 12px; color: #94A3B8;">
                                    <span><strong style="color: #475569;">Order ID:</strong> VT-20261025-0008</span>
                                    <span><strong style="color: #475569;">Time:</strong> Today, 08:40</span>
                                </div>
                            </div>
                            <button onclick="this.closest('div[style*=border-radius]').remove(); const list=document.getElementById('sc-notices-list'); if(!list.children.length) document.getElementById('sc-notices-card').style.display='none';" style="flex-shrink:0; background:none; border:1px solid #E2E8F0; border-radius:6px; padding:4px 10px; font-size:12px; color:#64748B; cursor:pointer;">Dismiss</button>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" style="font-size: 13px; padding: 8px 16px;" onclick="window.openVerifyDrawer()">Verify Wallet</button>
                            <button class="btn btn-outline" style="font-size: 13px; padding: 8px 16px;" onclick="window.toggleNotifyPanel(this)">Notify Wallet Owner</button>
                        </div>
                        <!-- Inline Email Panel -->
                        <div class="notify-email-panel" style="display: none; background: white; border: 1px solid var(--clr-border); border-radius: 8px; padding: 16px; margin-top: 4px;">
                            <label style="font-size: 12px; font-weight: 600; color: var(--clr-text-main); display: block; margin-bottom: 8px;">Wallet Owner Email</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="email" placeholder="owner@domain.com" style="flex: 1; padding: 8px 12px; border: 1px solid var(--clr-border); border-radius: 6px; font-size: 13px; outline: none;" />
                                <button class="btn btn-primary" style="font-size: 13px; padding: 8px 16px;" onclick="window.sendNotifyEmail(this)">Send</button>
                            </div>
                        </div>
                    </div>

                    <!-- Notice Item 2: Unsupported wallet -->
                    <div style="background: #FFFDF5; border: 1px solid #FED7AA; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <span style="background-color: #FEF3C7; color: #D97706; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px;">NOT SUPPORTED</span>
                                <span style="font-weight: 600; font-size: 14px; color: #1E293B;">Wallet 0xab...ef12</span>
                            </div>
                            <p style="font-size: 13px; color: #64748B; margin: 0 0 10px 0; line-height: 1.6;">This wallet address is no longer supported for transactions with your account. Please update your withdrawal destination. Contact support if you have questions.</p>
                            <div style="display: flex; gap: 20px; font-size: 12px; color: #94A3B8;">
                                <span><strong style="color: #475569;">Since:</strong> Oct 23, 2026</span>
                            </div>
                        </div>
                        <button onclick="this.closest('div[style*=border-radius]').remove(); const list=document.getElementById('sc-notices-list'); if(!list.children.length) document.getElementById('sc-notices-card').style.display='none';" style="flex-shrink:0; background:none; border:1px solid #E2E8F0; border-radius:6px; padding:4px 10px; font-size:12px; color:#64748B; cursor:pointer;">Dismiss</button>
                    </div>

                </div>
            </div>

            <!-- Wallet Management Section -->
            <div class="card">
                <div class="card-header-flex">
                    <h2 class="card-title" style="margin-bottom: 0;">Address Book</h2>
                    <a href="#" class="view-all-link" onclick="window.openManageAddressesDrawer(); return false;">Manage Addresses</a>
                </div>

                <div style="display: flex; flex-direction: column; gap: 0; margin-top: 16px;">

                    <!-- Wallet 1 -->
                    <div class="wallet-card" style="border-radius: 0; border-left: none; border-right: none; border-top: none; border-bottom: 1px solid var(--clr-border); padding: 16px 0;" onclick="openWalletDrawer('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 'Inbound')">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="padding: 8px; background-color: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0; flex-shrink: 0;">
                                <i data-lucide="arrow-down-left" style="color: #10B981; width: 18px; height: 18px;"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span style="font-weight: 600; font-size: 14px; color: var(--clr-text-main);">Kraken Exchange</span>
                                    <span style="background-color: #D1FAE5; color: #059669; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">Top Up</span>
                                    <span style="background-color: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">TRC-20</span>
                                </div>
                                <div style="font-size: 12px; color: var(--clr-text-muted); font-family: monospace;">TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t</div>
                            </div>
                            <div style="font-size: 12px; color: var(--clr-text-muted); flex-shrink: 0;">Last used: Today</div>
                        </div>
                    </div>

                    <!-- Wallet 2 -->
                    <div class="wallet-card" style="border-radius: 0; border-left: none; border-right: none; border-top: none; border-bottom: 1px solid var(--clr-border); padding: 16px 0;" onclick="openWalletDrawer('0xabcdef1234567890abcdef1234567890abcdef12', 'Outbound')">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="padding: 8px; background-color: #FFFBEB; border-radius: 8px; border: 1px solid #FDE68A; flex-shrink: 0;">
                                <i data-lucide="arrow-up-right" style="color: #F59E0B; width: 18px; height: 18px;"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span style="font-weight: 600; font-size: 14px; color: var(--clr-text-main);">Vendor Binance</span>
                                    <span style="background-color: #FEF3C7; color: #D97706; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">Transfer</span>
                                    <span style="background-color: #F3F4F6; color: #4B5563; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">ERC-20</span>
                                </div>
                                <div style="font-size: 12px; color: var(--clr-text-muted); font-family: monospace;">0xabcdef1234567890abcdef1234567890abcdef12</div>
                            </div>
                            <div style="font-size: 12px; color: var(--clr-text-muted); flex-shrink: 0;">Last used: Yesterday</div>
                        </div>
                    </div>

                    <!-- Wallet 3 -->
                    <div class="wallet-card" style="border-radius: 0; border-left: none; border-right: none; border-top: none; border-bottom: none; padding: 16px 0;" onclick="openWalletDrawer('0x1234567890abcdef1234567890abcdef12345678', 'Inbound')">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="padding: 8px; background-color: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0; flex-shrink: 0;">
                                <i data-lucide="arrow-down-left" style="color: #10B981; width: 18px; height: 18px;"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span style="font-weight: 600; font-size: 14px; color: var(--clr-text-main);">Partner Treasury</span>
                                    <span style="background-color: #D1FAE5; color: #059669; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">Top Up</span>
                                    <span style="background-color: #F3F4F6; color: #4B5563; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px;">ERC-20</span>
                                </div>
                                <div style="font-size: 12px; color: var(--clr-text-muted); font-family: monospace;">0x1234567890abcdef1234567890abcdef12345678</div>
                            </div>
                            <div style="font-size: 12px; color: var(--clr-text-muted); flex-shrink: 0;">Last used: Oct 23</div>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Transaction History Data Table -->
            <div class="card recent-orders-card">
                <div class="card-header-flex">
                    <h2 class="card-title" style="margin-bottom: 0;">Vault Transactions</h2>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="filter" style="width: 14px; height: 14px;"></i> Filters
                        </button>
                        <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="download" style="width: 14px; height: 14px;"></i> Export
                        </button>
                    </div>
                </div>
                <div class="table-responsive" style="margin-top: 16px;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Order ID</th>
                                <th>Type</th>
                                <th>From</th>
                                <th>To</th>
                                <th class="text-right">Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr onclick="alert('Viewing Order Details...')">
                                <td class="text-muted">Today, 09:12</td>
                                <td style="font-family: monospace; font-size: 12px; color: #2563EB;">VT-20261025-0031</td>
                                <td class="font-medium">Top Up</td>
                                <td style="font-size: 12px; color: var(--clr-text-muted); font-family: monospace;">0x12...5678</td>
                                <td style="font-size: 12px; color: var(--clr-text-muted);">Stablecoin Vault</td>
                                <td class="text-right font-medium text-success">+ 5,000.00 <span class="currency">USDC</span></td>
                                <td><span class="status-badge status-success">Completed</span></td>
                            </tr>
                            <tr onclick="alert('Viewing Order Details...')">
                                <td class="text-muted">Yesterday, 16:45</td>
                                <td style="font-family: monospace; font-size: 12px; color: #2563EB;">VT-20261024-0018</td>
                                <td class="font-medium">Transfer</td>
                                <td style="font-size: 12px; color: var(--clr-text-muted);">Stablecoin Vault</td>
                                <td style="font-size: 12px; color: var(--clr-text-muted); font-family: monospace;">0xab...ef12</td>
                                <td class="text-right font-medium">- 12,500.00 <span class="currency">USDT</span></td>
                                <td><span class="status-badge status-success">Completed</span></td>
                            </tr>
                            <tr onclick="alert('Viewing Order Details...')">
                                <td class="text-muted">Oct 23, 11:20</td>
                                <td style="font-family: monospace; font-size: 12px; color: #2563EB;">VT-20261023-0004</td>
                                <td class="font-medium">Top Up</td>
                                <td style="font-size: 12px; color: var(--clr-text-muted); font-family: monospace;">TR7N...jLj6t</td>
                                <td style="font-size: 12px; color: var(--clr-text-muted);">Stablecoin Vault</td>
                                <td class="text-right font-medium text-success">+ 100,000.00 <span class="currency">USDT</span></td>
                                <td><span class="status-badge status-warning" style="background-color: #FEF3C7; color: #D97706;">Confirming</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    `;

    const merchantProfileHTML = `
        <div class="fade-in" style="display: flex; flex-direction: column; gap: 24px;">
            <div class="card" style="padding: 28px 32px; background: linear-gradient(180deg, #FCFDFE 0%, #F8FAFC 100%); border: 1px solid #E2E8F0;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                        <div style="width: 88px; height: 88px; border-radius: 24px; background: linear-gradient(180deg, #DCFCE7 0%, #BBF7D0 100%); border: 1px solid #86EFAC; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 0 rgba(255,255,255,0.65); color: #166534; font-size: 34px; font-weight: 700;">
                            N
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                                <h2 style="font-size: 30px; font-weight: 700; color: #0F172A; margin: 0;">ABC Trading Pte Ltd</h2>
                                <span style="display: inline-flex; align-items: center; gap: 8px; background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; padding: 8px 12px; border-radius: 999px; font-size: 13px; font-weight: 700;">
                                    <i data-lucide="shield-alert" style="width: 14px; height: 14px;"></i>
                                    Business Verification Required
                                </span>
                            </div>
                            <div style="font-size: 14px; color: #64748B;">Created on: Nov 21, 2025, 10:49</div>
                        </div>
                    </div>
                    <button class="btn btn-outline" style="padding: 10px 16px; font-size: 13px;">Edit Profile</button>
                </div>
            </div>

            <div class="card" style="padding: 0; overflow: hidden;">
                <div style="padding: 24px 28px; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; gap: 10px;">
                    <div style="width: 34px; height: 34px; border-radius: 10px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; color: #2563EB;">
                        <i data-lucide="badge-info" style="width: 16px; height: 16px;"></i>
                    </div>
                    <h3 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0;">Merchant Profile</h3>
                </div>
                <div style="padding: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px 48px;">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em;">Business Type</div>
                        <div style="font-size: 15px; font-weight: 600; color: #0F172A;">Education / Training</div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em;">Country / Region</div>
                        <div style="font-size: 15px; font-weight: 600; color: #0F172A;">Singapore (SG)</div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em;">Phone Number</div>
                        <div style="font-size: 15px; font-weight: 600; color: #0F172A;">(+65) 88886666</div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em;">Business Address</div>
                        <div style="font-size: 15px; font-weight: 600; color: #0F172A; line-height: 1.6;">Marina One West Tower, #05-07, Singapore 018937</div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em;">Website</div>
                        <div style="font-size: 15px; font-weight: 600; color: #2563EB;">--</div>
                    </div>
                </div>
            </div>

            <div class="card" style="padding: 0; overflow: hidden;">
                <div style="padding: 24px 28px; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; gap: 10px;">
                    <div style="width: 34px; height: 34px; border-radius: 10px; background: #F8FAFC; display: flex; align-items: center; justify-content: center; color: #475569; border: 1px solid #E2E8F0;">
                        <i data-lucide="file-text" style="width: 16px; height: 16px;"></i>
                    </div>
                    <h3 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0;">Service Agreements & Policies</h3>
                </div>
                <div style="padding: 10px 28px 8px 28px; display: flex; flex-direction: column;">
                    <div style="padding: 18px 0; display: grid; grid-template-columns: 1.8fr 0.9fr 110px; gap: 20px; align-items: center; border-bottom: 1px solid #F1F5F9;">
                        <a href="#" style="font-size: 15px; font-weight: 600; color: #2563EB; text-decoration: none;">1. Obita Privacy Policy</a>
                        <div style="font-size: 13px; color: #64748B;">Signed on: Nov 21, 2025</div>
                        <button class="btn btn-outline" style="padding: 8px 12px; font-size: 12px;">View</button>
                    </div>
                    <div style="padding: 18px 0; display: grid; grid-template-columns: 1.8fr 0.9fr 110px; gap: 20px; align-items: center;">
                        <a href="#" style="font-size: 15px; font-weight: 600; color: #2563EB; text-decoration: none;">2. Obita Enterprise Wallet Service Agreement</a>
                        <div style="font-size: 13px; color: #64748B;">Signed on: Nov 21, 2025</div>
                        <button class="btn btn-outline" style="padding: 8px 12px; font-size: 12px;">View</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    function renderPlaceholderContent(title) {
        if (title === 'Overview') {
            contentBody.innerHTML = overviewHTML;
            // Initialize Chart after injecting HTML
            setTimeout(() => {
                initFundFlowChart();
                // Sync Activity Card height to Unified Asset Card height
                const unifiedCard = document.querySelector('.unified-assets-card');
                const activitiesCard = document.querySelector('.activities-card');
                if(unifiedCard && activitiesCard) {
                    activitiesCard.style.height = unifiedCard.offsetHeight + 'px';
                    activitiesCard.style.display = 'flex';
                    activitiesCard.style.flexDirection = 'column';
                    const feed = activitiesCard.querySelector('.activity-feed');
                    if(feed) {
                        feed.style.flex = '1';
                        feed.style.overflowY = 'auto';
                        // hide scrollbar conceptually for a cleaner look
                        feed.style.scrollbarWidth = 'none'; 
                    }
                }
            }, 0);
        } else if (title === 'Approval List') {
            approvalListView = 'list';
            activeApprovalRequestId = null;
            expandedApprovalActionId = null;
            renderApprovalListPage();
        } else if (title === 'Merchant Profile') {
            contentBody.innerHTML = merchantProfileHTML;
            lucide.createIcons();
        } else if (title === 'Approval Rules') {
            approvalRuleView = 'list';
            activeApprovalRuleId = null;
            renderApprovalRulesPage();
        } else if (title === 'Stablecoin Vault') {
            contentBody.innerHTML = stablecoinVaultHTML;
        } else if (title === 'Conversion') {
            contentBody.innerHTML = `
            <div class="fade-in" style="max-width: 560px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px;">
                
                <!-- Step 1: Input -->
                <div id="pg-cv-step-1">

                    <!-- Asset Vault Selector -->
                    <div style="background: white; border: 1px solid var(--clr-border); border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                        <label style="display:block; font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Asset Vault</label>
                        <select id="pg-cv-vault" onchange="window.pgCvOnVaultChange()" style="width: 100%; padding: 10px 14px; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 14px; font-weight: 600; color: #1E293B; background: #F8FAFC;">
                            <option value="stablecoin">Stablecoin Vault</option>
                            <option value="fiat">Fiat Vault</option>
                        </select>
                    </div>

                    <!-- FROM Card -->
                    <div style="background: #F8FAFC; border: 1px solid var(--clr-border); border-radius: 10px; padding: 20px;">
                        <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">FROM</div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <select id="pg-cv-from-coin" onchange="window.pgCvUpdateQuote()" style="font-size: 20px; font-weight: 700; color: #1E293B; border: none; background: transparent; outline: none; cursor: pointer; padding: 4px 0;">
                                <option value="USDT">USDT</option>
                                <option value="USDC">USDC</option>
                            </select>
                            <input type="number" id="pg-cv-amount" placeholder="0.00" oninput="window.pgCvUpdateQuote()" style="flex: 1; border: none; background: transparent; font-size: 28px; font-weight: 600; text-align: right; outline: none; color: #1E293B; padding: 4px 0;">
                        </div>
                        <div id="pg-cv-error" style="display:none; color:#DC2626; font-size:12px; font-weight:500; text-align:right; margin-top:6px;">Insufficient balance.</div>
                        <div style="text-align: right; font-size: 12px; color: #94A3B8; margin-top: 4px;">
                            Available: <span id="pg-cv-avail" style="font-weight: 600; color: #334155;">14,000,000.00</span>
                        </div>
                    </div>

                    <!-- Arrow Divider -->
                    <div style="display: flex; justify-content: center; margin: -2px 0; position: relative; z-index: 1;">
                        <div style="width: 36px; height: 36px; background: white; border: 1px solid var(--clr-border); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">
                            <i data-lucide="arrow-down" style="width: 18px; height: 18px; color: #64748B;"></i>
                        </div>
                    </div>

                    <!-- TO Card -->
                    <div style="background: white; border: 1px solid var(--clr-border); border-radius: 10px; padding: 20px; margin-top: -2px;">
                        <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">TO</div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <select id="pg-cv-to-coin" onchange="window.pgCvUpdateQuote()" style="font-size: 16px; font-weight: 600; color: #1E293B; padding: 8px 10px; border: 1px solid var(--clr-border); border-radius: 6px; background: #F8FAFC; outline: none; cursor: pointer; flex-shrink:0;">
                                <option value="USD">USD - US Dollar</option>
                                <option value="USDC">USDC - USD Coin</option>
                                <option value="HKD">HKD - Hong Kong Dollar</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="BRL">BRL - Brazilian Real</option>
                            </select>
                            <div id="pg-cv-est-amt" style="flex: 1; font-size: 28px; font-weight: 600; text-align: right; color: #0F172A;">0.00</div>
                        </div>
                    </div>

                    <!-- Market Quote Box -->
                    <div style="background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 10px; padding: 16px 20px; margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 13px;">
                            <span style="color: #64748B;">Exchange Rate</span>
                            <span id="pg-cv-rate-text" style="font-weight: 600; color: #1E293B;">1 USDT = 1 USD</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 13px;">
                            <span style="color: #64748B;">Conversion Fee</span>
                            <span style="font-weight: 500; color: #10B981;">0.00 (Zero Fee)</span>
                        </div>
                        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 6px; font-size: 11px; color: #D97706; font-weight: 600;">
                            <i data-lucide="timer" style="width: 13px; height: 13px;"></i> Rate guaranteed for 15s
                        </div>
                    </div>

                    <!-- CTA -->
                    <div style="margin-top: 24px;">
                        <button onclick="window.pgCvGoStep2()" style="width: 100%; padding: 14px; background: #0F172A; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; letter-spacing: 0.3px;">Review Quote</button>
                    </div>
                </div>

                <!-- Step 2: Confirm -->
                <div id="pg-cv-step-2" style="display: none;">
                    
                    <div style="text-align: center; padding: 32px 0 24px;">
                        <div style="font-size: 13px; color: #64748B; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">You are converting</div>
                        <div style="font-size: 32px; font-weight: 700; color: #1E293B;"><span id="pg-cs2-src-amt">0.00</span> <span id="pg-cs2-src-coin" style="font-size: 18px; color: #64748B;">USDT</span></div>
                        <div style="margin: 16px 0;"><i data-lucide="arrow-down" style="width: 24px; height: 24px; color: #CBD5E1;"></i></div>
                        <div style="font-size: 36px; font-weight: 700; color: #059669;"><span id="pg-cs2-tgt-amt">0.00</span> <span id="pg-cs2-tgt-coin" style="font-size: 20px; color: #10B981;">USD</span></div>
                    </div>

                    <div style="background: white; border: 1px solid var(--clr-border); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 14px;">
                        <div style="font-size: 11px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">Transaction Details</div>
                        <div style="display: flex; justify-content: space-between; font-size: 14px;">
                            <span style="color: #64748B;">Source Vault</span>
                            <span id="pg-cs2-src-vault" style="font-weight: 600; color: #1E293B;">Stablecoin Vault</span>
                        </div>
                        <div style="height: 1px; background: var(--clr-border);"></div>
                        <div style="display: flex; justify-content: space-between; font-size: 14px;">
                            <span style="color: #64748B;">Secured Rate</span>
                            <span id="pg-cs2-rate" style="font-weight: 600; color: #1E293B; font-family: monospace;">-</span>
                        </div>
                        <div style="height: 1px; background: var(--clr-border);"></div>
                        <div style="display: flex; justify-content: space-between; font-size: 14px;">
                            <span style="color: #64748B;">Fee</span>
                            <span style="font-weight: 600; color: #10B981;">No Fee</span>
                        </div>
                        <div style="height: 1px; background: var(--clr-border);"></div>
                        <div style="display: flex; justify-content: space-between; font-size: 14px;">
                            <span style="color: #64748B;">Destination Vault</span>
                            <span id="pg-cs2-dest-vault" style="font-weight: 600; color: #2563EB;">Fiat Vault</span>
                        </div>
                    </div>

                    <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 10px;">
                        <button onclick="window.pgCvExecute()" style="width: 100%; padding: 14px; background: #2563EB; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">Confirm Convert</button>
                        <button onclick="window.pgCvBackToStep1()" style="width: 100%; padding: 12px; background: transparent; color: #64748B; border: none; font-size: 14px; font-weight: 500; cursor: pointer;">← Back to Edit</button>
                    </div>
                </div>

                </div>

            </div>

            <!-- Conversion Order List -->
            <div class="card fade-in" style="margin-top: 32px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
                    <h2 class="card-title" style="margin: 0;">Conversion Order List</h2>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <select style="padding: 6px 10px; font-size: 13px; border: 1px solid var(--clr-border); border-radius: 6px; background: #F8FAFC; color: #334155; outline: none;">
                            <option>All Statuses</option>
                            <option>Completed</option>
                            <option>Processing</option>
                            <option>Failed</option>
                        </select>
                        <input type="text" placeholder="Search Order ID..." style="padding: 6px 10px; font-size: 13px; border: 1px solid var(--clr-border); border-radius: 6px; background: white; color: #334155; outline: none; width: 160px;">
                    </div>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--clr-border);">
                                <th style="text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">Order ID</th>
                                <th style="text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">Date & Time</th>
                                <th style="text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">From</th>
                                <th style="text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">To</th>
                                <th style="text-align: right; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">Amount (From)</th>
                                <th style="text-align: right; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">Amount (To)</th>
                                <th style="text-align: center; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">Rate</th>
                                <th style="text-align: center; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                            </tr>
                        </thead>
                        <tbody id="cv-order-list-body">
                            <tr style="border-bottom: 1px solid #F1F5F9;">
                                <td style="padding: 14px; font-weight: 600; color: #2563EB; font-family: monospace; white-space: nowrap;">CV-20261025-009</td>
                                <td style="padding: 14px; color: #64748B; white-space: nowrap;">Today, 11:30</td>
                                <td style="padding: 14px;"><span style="font-weight: 600; color: #1E293B;">USDT</span> <span style="font-size: 11px; color: #94A3B8;">Stablecoin</span></td>
                                <td style="padding: 14px;"><span style="font-weight: 600; color: #1E293B;">HKD</span> <span style="font-size: 11px; color: #94A3B8;">Fiat</span></td>
                                <td style="padding: 14px; text-align: right; font-weight: 600; color: #1E293B;">500,000.00 USDT</td>
                                <td style="padding: 14px; text-align: right; font-weight: 600; color: #059669;">3,910,000.00 HKD</td>
                                <td style="padding: 14px; text-align: center; font-family: monospace; font-size: 12px; color: #475569;">1 USDT = 7.82 HKD</td>
                                <td style="padding: 14px; text-align: center;"><span style="background: #D1FAE5; color: #059669; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px;">Completed</span></td>
                            </tr>
                            <tr style="border-bottom: 1px solid #F1F5F9;">
                                <td style="padding: 14px; font-weight: 600; color: #2563EB; font-family: monospace; white-space: nowrap;">CV-20261024-007</td>
                                <td style="padding: 14px; color: #64748B; white-space: nowrap;">Yesterday, 15:02</td>
                                <td style="padding: 14px;"><span style="font-weight: 600; color: #1E293B;">USDC</span> <span style="font-size: 11px; color: #94A3B8;">Stablecoin</span></td>
                                <td style="padding: 14px;"><span style="font-weight: 600; color: #1E293B;">EUR</span> <span style="font-size: 11px; color: #94A3B8;">Fiat</span></td>
                                <td style="padding: 14px; text-align: right; font-weight: 600; color: #1E293B;">200,000.00 USDC</td>
                                <td style="padding: 14px; text-align: right; font-weight: 600; color: #059669;">184,000.00 EUR</td>
                                <td style="padding: 14px; text-align: center; font-family: monospace; font-size: 12px; color: #475569;">1 USDC = 0.92 EUR</td>
                                <td style="padding: 14px; text-align: center;"><span style="background: #D1FAE5; color: #059669; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px;">Completed</span></td>
                            </tr>
                            <tr style="border-bottom: 1px solid #F1F5F9; background: #FFFBEB;">
                                <td style="padding: 14px; font-weight: 600; color: #2563EB; font-family: monospace; white-space: nowrap;">CV-20261024-005</td>
                                <td style="padding: 14px; color: #64748B; white-space: nowrap;">Yesterday, 09:45</td>
                                <td style="padding: 14px;"><span style="font-weight: 600; color: #1E293B;">USD</span> <span style="font-size: 11px; color: #94A3B8;">Fiat</span></td>
                                <td style="padding: 14px;"><span style="font-weight: 600; color: #1E293B;">USDT</span> <span style="font-size: 11px; color: #94A3B8;">Stablecoin</span></td>
                                <td style="padding: 14px; text-align: right; font-weight: 600; color: #1E293B;">100,000.00 USD</td>
                                <td style="padding: 14px; text-align: right; font-weight: 600; color: #64748B;">— —</td>
                                <td style="padding: 14px; text-align: center; font-family: monospace; font-size: 12px; color: #475569;">1 USD = 1.00 USDT</td>
                                <td style="padding: 14px; text-align: center;"><span style="background: #FEF3C7; color: #D97706; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px;">Processing</span></td>
                            </tr>
                            <tr style="border-bottom: 1px solid #F1F5F9;">
                                <td style="padding: 14px; font-weight: 600; color: #2563EB; font-family: monospace; white-space: nowrap;">CV-20261023-002</td>
                                <td style="padding: 14px; color: #64748B; white-space: nowrap;">Oct 23, 14:11</td>
                                <td style="padding: 14px;"><span style="font-weight: 600; color: #1E293B;">USDT</span> <span style="font-size: 11px; color: #94A3B8;">Stablecoin</span></td>
                                <td style="padding: 14px;"><span style="font-weight: 600; color: #1E293B;">BRL</span> <span style="font-size: 11px; color: #94A3B8;">Fiat</span></td>
                                <td style="padding: 14px; text-align: right; font-weight: 600; color: #1E293B;">80,000.00 USDT</td>
                                <td style="padding: 14px; text-align: right; font-weight: 600; color: #059669;">400,800.00 BRL</td>
                                <td style="padding: 14px; text-align: center; font-family: monospace; font-size: 12px; color: #475569;">1 USDT = 5.01 BRL</td>
                                <td style="padding: 14px; text-align: center;"><span style="background: #D1FAE5; color: #059669; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px;">Completed</span></td>
                            </tr>
                            <tr>
                                <td style="padding: 14px; font-weight: 600; color: #2563EB; font-family: monospace; white-space: nowrap;">CV-20261022-001</td>
                                <td style="padding: 14px; color: #64748B; white-space: nowrap;">Oct 22, 10:05</td>
                                <td style="padding: 14px;"><span style="font-weight: 600; color: #1E293B;">HKD</span> <span style="font-size: 11px; color: #94A3B8;">Fiat</span></td>
                                <td style="padding: 14px;"><span style="font-weight: 600; color: #1E293B;">USD</span> <span style="font-size: 11px; color: #94A3B8;">Fiat</span></td>
                                <td style="padding: 14px; text-align: right; font-weight: 600; color: #1E293B;">1,000,000.00 HKD</td>
                                <td style="padding: 14px; text-align: right; font-weight: 600; color: #059669;">128,000.00 USD</td>
                                <td style="padding: 14px; text-align: center; font-family: monospace; font-size: 12px; color: #475569;">1 HKD = 0.128 USD</td>
                                <td style="padding: 14px; text-align: center;"><span style="background: #FEE2E2; color: #DC2626; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px;">Failed</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--clr-border); font-size: 13px; color: #64748B;">
                    <div>Showing 5 of 5 orders</div>
                    <div style="display: flex; gap: 4px;">
                        <button style="padding: 6px 12px; border: 1px solid var(--clr-border); border-radius: 4px; background: white; color: #64748B; font-size: 12px; cursor: pointer;">← Prev</button>
                        <button style="padding: 6px 12px; border: 1px solid #2563EB; border-radius: 4px; background: #2563EB; color: white; font-size: 12px; font-weight: 600; cursor: pointer;">1</button>
                        <button style="padding: 6px 12px; border: 1px solid var(--clr-border); border-radius: 4px; background: white; color: #64748B; font-size: 12px; cursor: pointer;">Next →</button>
                    </div>
                </div>
            </div>`;

            lucide.createIcons();

            const PG_CV_RATES = {
                'USDT': { 'USD': 1.00, 'USDC': 0.9998, 'HKD': 7.82, 'EUR': 0.92, 'BRL': 5.01 },
                'USDC': { 'USD': 1.00, 'USDT': 1.0002, 'HKD': 7.82, 'EUR': 0.92, 'BRL': 5.01 },
                'USD':  { 'USDT': 1.00, 'USDC': 1.00, 'HKD': 7.82, 'EUR': 0.92, 'BRL': 5.01 },
                'HKD':  { 'USD': 0.128, 'EUR': 0.118, 'USDT': 0.128, 'USDC': 0.128, 'BRL': 0.641 },
                'EUR':  { 'USD': 1.09, 'HKD': 8.50, 'USDT': 1.09, 'USDC': 1.09, 'BRL': 5.45 },
                'BRL':  { 'USD': 0.20, 'EUR': 0.183, 'USDT': 0.20, 'USDC': 0.20, 'HKD': 1.56 }
            };

            const PG_CV_VAULT_COINS = {
                stablecoin: { coins: ['USDT','USDC'], balances: { USDT: 14000000, USDC: 10050000 } },
                fiat:       { coins: ['USD','HKD','EUR','BRL'], balances: { USD: 2500000, HKD: 8400000, EUR: 950000, BRL: 980000 } }
            };

            window.pgCvCurrentRate = 1;

            const ALL_CURRENCIES = [
                { value: 'USDT', label: 'USDT - Tether' },
                { value: 'USDC', label: 'USDC - USD Coin' },
                { value: 'USD',  label: 'USD - US Dollar' },
                { value: 'HKD',  label: 'HKD - Hong Kong Dollar' },
                { value: 'EUR',  label: 'EUR - Euro' },
                { value: 'BRL',  label: 'BRL - Brazilian Real' },
            ];

            function pgCvRebuildToList() {
                const fromCoin = document.getElementById('pg-cv-from-coin').value;
                const toSel = document.getElementById('pg-cv-to-coin');
                const prevTo = toSel.value;
                toSel.innerHTML = ALL_CURRENCIES
                    .filter(c => c.value !== fromCoin)
                    .map(c => `<option value="${c.value}"${c.value === prevTo && c.value !== fromCoin ? ' selected' : ''}>${c.label}</option>`)
                    .join('');
                // If previous selection is now invalid (same as from), default to first option
                if (toSel.value === fromCoin || !toSel.value) {
                    toSel.selectedIndex = 0;
                }
            }

            window.pgCvOnVaultChange = function() {
                const vault = document.getElementById('pg-cv-vault').value;
                const vaultData = PG_CV_VAULT_COINS[vault];
                const fromSel = document.getElementById('pg-cv-from-coin');
                fromSel.innerHTML = vaultData.coins.map(c => `<option value="${c}">${c}</option>`).join('');
                pgCvRebuildToList();
                window.pgCvUpdateQuote();
            };

            window.pgCvUpdateQuote = function() {
                pgCvRebuildToList();
                const vault = document.getElementById('pg-cv-vault').value;
                const fromCoin = document.getElementById('pg-cv-from-coin').value;
                const toCoin = document.getElementById('pg-cv-to-coin').value;
                const amt = parseFloat(document.getElementById('pg-cv-amount').value) || 0;
                const balances = PG_CV_VAULT_COINS[vault].balances;
                const avail = balances[fromCoin] || 0;
                
                document.getElementById('pg-cv-avail').textContent = avail.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                
                const rate = (PG_CV_RATES[fromCoin] && PG_CV_RATES[fromCoin][toCoin]) ? PG_CV_RATES[fromCoin][toCoin] : 1;
                window.pgCvCurrentRate = rate;
                const estAmt = amt * rate;
                
                document.getElementById('pg-cv-est-amt').textContent = estAmt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                document.getElementById('pg-cv-rate-text').textContent = '1 ' + fromCoin + ' = ' + rate + ' ' + toCoin;
                
                if (amt > avail) {
                    document.getElementById('pg-cv-error').style.display = 'block';
                    return false;
                } else {
                    document.getElementById('pg-cv-error').style.display = 'none';
                    return true;
                }
            };

            window.pgCvGoStep2 = function() {
                const amt = parseFloat(document.getElementById('pg-cv-amount').value) || 0;
                if (amt <= 0) { alert('Please enter a valid amount.'); return; }
                if (!window.pgCvUpdateQuote()) return;

                const fromCoin = document.getElementById('pg-cv-from-coin').value;
                const toCoin = document.getElementById('pg-cv-to-coin').value;
                const tgtAmt = amt * window.pgCvCurrentRate;
                const vaultLabel = document.getElementById('pg-cv-vault').options[document.getElementById('pg-cv-vault').selectedIndex].text;
                const destVault = (['USDT','USDC'].includes(toCoin)) ? 'Stablecoin Vault' : 'Fiat Vault';

                document.getElementById('pg-cs2-src-amt').textContent = amt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                document.getElementById('pg-cs2-src-coin').textContent = fromCoin;
                document.getElementById('pg-cs2-tgt-amt').textContent = tgtAmt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                document.getElementById('pg-cs2-tgt-coin').textContent = toCoin;
                document.getElementById('pg-cs2-rate').textContent = '1 ' + fromCoin + ' = ' + window.pgCvCurrentRate + ' ' + toCoin;
                document.getElementById('pg-cs2-src-vault').textContent = vaultLabel;
                document.getElementById('pg-cs2-dest-vault').textContent = destVault;

                document.getElementById('pg-cv-step-1').style.display = 'none';
                document.getElementById('pg-cv-step-2').style.display = 'block';
                lucide.createIcons();
            };

            window.pgCvBackToStep1 = function() {
                document.getElementById('pg-cv-step-1').style.display = 'block';
                document.getElementById('pg-cv-step-2').style.display = 'none';
            };

            window.pgCvExecute = function() {
                const fromCoin = document.getElementById('pg-cv-from-coin').value;
                const toCoin = document.getElementById('pg-cv-to-coin').value;
                const amt = parseFloat(document.getElementById('pg-cv-amount').value) || 0;
                notifyOrderCreated(
                    'Conversion Order Created',
                    `${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${fromCoin} to ${toCoin} conversion order has been created.`,
                    'View Convert',
                    () => openInbox()
                );
                alert('Conversion executed successfully.');
                window.pgCvBackToStep1();
                document.getElementById('pg-cv-amount').value = '';
                window.pgCvUpdateQuote();
            };

        } else if (title === 'Fiat Vault') {
            contentBody.innerHTML = fiatVaultHTML;
        } else {
            contentBody.innerHTML = `
                <div class="welcome-card fade-in">
                    <h2>${title}</h2>
                    <p>Welcome to the ${title} page. This area will display relevant data, tables, and actions specific to ${title}.</p>
                    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--clr-border);">
                       <p style="color: var(--clr-text-muted); font-size: 14px;">(Placeholder Framework)</p>
                    </div>
                </div>
            `;
        }
        
        // Re-initialize icons for newly added HTML
        lucide.createIcons();
    }
    
    function initFundFlowChart() {
        const ctx = document.getElementById('fundFlowChart');
        if (!ctx || typeof Chart === 'undefined') return;
        
        // Destroy existing chart if any to avoid overlapping on re-renders
        if (window.fundFlowChartInstance) {
            window.fundFlowChartInstance.destroy();
        }
        
        window.fundFlowChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [
                    {
                        label: 'Inbound',
                        data: [400000, 600000, 550000, 906120],
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 0
                    },
                    {
                        label: 'Outbound',
                        data: [200000, 300000, 250000, 450500],
                        borderColor: '#64748B',
                        backgroundColor: 'rgba(100, 116, 139, 0.05)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1E293B',
                        padding: 12,
                        titleFont: { size: 13, family: 'Inter' },
                        bodyFont: { size: 13, family: 'Inter' }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: '#F1F5F9' },
                        border: { display: false },
                        ticks: {
                            callback: function(value) {
                                return '$' + value / 1000 + 'k';
                            },
                            color: '#94A3B8'
                        }
                    },
                    x: { 
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: '#94A3B8' }
                    }
                }
            }
        });
        
        // Add click handlers for time selector dummy interaction
        const timeOptions = document.querySelectorAll('.time-option');
        timeOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                timeOptions.forEach(o => o.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }
    
    // Initialize first page
    renderPlaceholderContent('Overview');
});
