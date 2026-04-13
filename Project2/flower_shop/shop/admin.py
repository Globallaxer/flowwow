from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.shortcuts import redirect
from django.urls import path
from django.http import HttpResponseRedirect
from django.contrib import messages
from django.utils.html import format_html  # Добавьте этот импорт
from .models import User, Flower, Cart, CartItem, Favorite, Order, OrderItem

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'phone', 'address', 'is_staff', 'created_at')
    list_filter = ('is_staff', 'is_active', 'created_at')
    search_fields = ('username', 'email', 'phone')
    fieldsets = UserAdmin.fieldsets + (
        ('Дополнительная информация', {'fields': ('phone', 'address', 'avatar')}),
    )

class FlowerAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'rating', 'stock', 'category', 'created_at')
    list_filter = ('category', 'created_at', 'rating')
    search_fields = ('name', 'description')
    list_editable = ('price', 'stock', 'rating')
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'description', 'category', 'image')
        }),
        ('Цены и наличие', {
            'fields': ('price', 'stock', 'rating')
        }),
    )

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 1
    raw_id_fields = ('flower',)
    readonly_fields = ('get_total_price',)
    
    def get_total_price(self, obj):
        return f'{obj.get_total_price()} ₽'
    get_total_price.short_description = 'Сумма'

class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'get_total_items', 'get_total_price', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'user__email')
    inlines = [CartItemInline]
    readonly_fields = ('get_total_price', 'get_total_items')
    
    def get_total_price(self, obj):
        return f'{obj.get_total_price()} ₽'
    get_total_price.short_description = 'Общая сумма'
    
    def get_total_items(self, obj):
        return obj.get_total_items()
    get_total_items.short_description = 'Количество товаров'

class FavoriteAdmin(admin.ModelAdmin):
    list_display = ('user', 'flower', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'flower__name')
    raw_id_fields = ('user', 'flower')

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('flower', 'quantity', 'price_at_time', 'get_total_price')
    raw_id_fields = ('flower',)
    can_delete = True
    show_change_link = True
    
    def get_total_price(self, obj):
        if obj.id:
            return f'{obj.get_total_price()} ₽'
        return '0 ₽'
    get_total_price.short_description = 'Сумма'
    
    def has_add_permission(self, request, obj=None):
        # Запрещаем ручное добавление через админку
        return False

class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total_price', 'status', 'get_items_count', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'user__email', 'address', 'phone')
    list_editable = ('status',)
    readonly_fields = ('total_price', 'created_at', 'updated_at', 'get_items_display')
    inlines = [OrderItemInline]
    actions = ['confirm_orders', 'cancel_orders', 'create_from_cart_action']
    
    fieldsets = (
        ('Информация о заказе', {
            'fields': ('user', 'status', 'total_price', 'get_items_display')
        }),
        ('Данные для доставки', {
            'fields': ('address', 'phone', 'comment')
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_items_count(self, obj):
        return obj.order_items.count()
    get_items_count.short_description = 'Количество товаров'
    get_items_count.admin_order_field = 'order_items__count'
    
    def get_items_display(self, obj):
        items = obj.order_items.all()
        if not items:
            return "Нет товаров. Используйте кнопку 'Загрузить из корзины' ниже."
        
        # Используем format_html для правильного отображения HTML
        html = '<table style="width:100%; border-collapse: collapse;">'
        html += '<tr style="background-color: #f2f2f2;"><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr>'
        
        for item in items:
            html += f'''
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">{item.flower.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">{item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">{item.price_at_time} ₽</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><strong>{item.get_total_price()} ₽</strong></td>
            </tr>
            '''
        
        # Добавляем итоговую строку
        html += f'''
        <tr style="background-color: #f9f9f9; font-weight: bold;">
            <td colspan="3" style="padding: 8px; text-align: right;">Итого:</td>
            <td style="padding: 8px; text-align: right;">{obj.total_price} ₽</td>
        </tr>
        '''
        html += '</table>'
        
        # Возвращаем с пометкой, что это безопасный HTML
        return format_html(html)
    
    get_items_display.short_description = 'Состав заказа'
    
    def save_model(self, request, obj, form, change):
        if not obj.pk:  # При создании нового заказа
            super().save_model(request, obj, form, change)
            # Автоматически загружаем корзину
            success = obj.create_from_cart()
            if success:
                messages.success(request, f'Заказ создан. Товары из корзины пользователя {obj.user.username} загружены.')
            else:
                messages.warning(request, f'Заказ создан, но корзина пользователя {obj.user.username} пуста или не найдена.')
        else:
            super().save_model(request, obj, form, change)
    
    def response_add(self, request, obj, post_url_continue=None):
        """После добавления заказа перенаправляем на страницу редактирования"""
        return HttpResponseRedirect(f'/admin/shop/order/{obj.id}/change/')
    
    def create_from_cart_action(self, request, queryset):
        """Action для загрузки корзины в выбранные заказы"""
        count = 0
        for order in queryset:
            if order.order_items.count() == 0:
                if order.create_from_cart():
                    count += 1
                    self.message_user(request, f'Для заказа #{order.id} загружены товары из корзины')
                else:
                    self.message_user(request, f'У заказа #{order.id} нет корзины или она пуста', level='ERROR')
            else:
                self.message_user(request, f'В заказе #{order.id} уже есть товары', level='WARNING')
        
        if count > 0:
            self.message_user(request, f'Загружено {count} заказов из корзины')
    create_from_cart_action.short_description = 'Загрузить товары из корзины пользователя'
    
    def confirm_orders(self, request, queryset):
        updated = queryset.update(status='confirmed')
        self.message_user(request, f'{updated} заказ(ов) подтверждены')
    confirm_orders.short_description = 'Подтвердить выбранные заказы'
    
    def cancel_orders(self, request, queryset):
        updated = queryset.update(status='cancelled')
        self.message_user(request, f'{updated} заказ(ов) отменены')
    cancel_orders.short_description = 'Отменить выбранные заказы'
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('load-cart/<int:order_id>/', self.admin_site.admin_view(self.load_cart_view), name='load-cart'),
        ]
        return custom_urls + urls
    
    def load_cart_view(self, request, order_id):
        """Вьюха для ручной загрузки корзины"""
        from django.http import JsonResponse
        order = Order.objects.get(id=order_id)
        if order.create_from_cart():
            messages.success(request, f'Товары из корзины загружены в заказ #{order.id}')
        else:
            messages.error(request, f'Не удалось загрузить корзину (пустая или нет корзины)')
        return HttpResponseRedirect(f'/admin/shop/order/{order.id}/change/')

admin.site.register(User, CustomUserAdmin)
admin.site.register(Flower, FlowerAdmin)
admin.site.register(Cart, CartAdmin)
admin.site.register(Favorite, FavoriteAdmin)
admin.site.register(Order, OrderAdmin)