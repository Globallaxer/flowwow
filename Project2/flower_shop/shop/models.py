# shop/models.py - исправленная версия

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator

class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'users'
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
    
    def __str__(self):
        return self.username

class Flower(models.Model):
    name = models.CharField('Название', max_length=200)
    description = models.TextField('Описание')
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2, default=0)
    rating = models.DecimalField(
        'Рейтинг', 
        max_digits=3, 
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    image = models.ImageField('Изображение', upload_to='flowers/', blank=True, null=True)
    stock = models.IntegerField('В наличии', default=0)
    category = models.CharField('Категория', max_length=100, default='Розы')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'flowers'
        verbose_name = 'Цветок'
        verbose_name_plural = 'Цветы'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name

class Cart(models.Model):
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='cart',
        verbose_name='Пользователь'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'carts'
        verbose_name = 'Корзина'
        verbose_name_plural = 'Корзины'
    
    def get_total_price(self):
        total = sum(item.get_total_price() for item in self.cart_items.all())
        return total
    
    def get_total_items(self):
        return sum(item.quantity for item in self.cart_items.all())
    
    def __str__(self):
        return f'Корзина {self.user.username}'

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='cart_items')
    flower = models.ForeignKey(Flower, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.PositiveIntegerField('Количество', default=1)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'cart_items'
        verbose_name = 'Элемент корзины'
        verbose_name_plural = 'Элементы корзины'
        unique_together = ['cart', 'flower']
    
    def get_total_price(self):
        if self.flower and self.flower.price and self.quantity:
            return self.flower.price * self.quantity
        return 0
    
    def __str__(self):
        return f'{self.flower.name} x{self.quantity}'

class Favorite(models.Model):
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='favorites',
        verbose_name='Пользователь'
    )
    flower = models.ForeignKey(
        Flower, 
        on_delete=models.CASCADE, 
        related_name='favorited_by',
        verbose_name='Цветок'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'favorites'
        verbose_name = 'Избранное'
        verbose_name_plural = 'Избранное'
        unique_together = ['user', 'flower']
    
    def __str__(self):
        return f'{self.user.username} - {self.flower.name}'

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Ожидает обработки'),
        ('confirmed', 'Подтвержден'),
        ('shipped', 'Отправлен'),
        ('delivered', 'Доставлен'),
        ('cancelled', 'Отменен'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    total_price = models.DecimalField(
        'Итоговая сумма', 
        max_digits=10, 
        decimal_places=2, 
        default=0
    )
    status = models.CharField('Статус', max_length=20, choices=STATUS_CHOICES, default='pending')
    address = models.TextField('Адрес доставки')
    phone = models.CharField('Телефон', max_length=20)
    comment = models.TextField('Комментарий к заказу', blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'orders'
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'
        ordering = ['-created_at']
    
    def __str__(self):
        return f'Заказ #{self.id} - {self.user.username}'

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    flower = models.ForeignKey(Flower, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField('Количество', default=1)
    price_at_time = models.DecimalField(
        'Цена в момент заказа', 
        max_digits=10, 
        decimal_places=2, 
        default=0
    )
    
    class Meta:
        db_table = 'order_items'
        verbose_name = 'Элемент заказа'
        verbose_name_plural = 'Элементы заказа'
    
    def get_total_price(self):
        if self.price_at_time and self.quantity:
            return self.price_at_time * self.quantity
        return 0
    
    def save(self, *args, **kwargs):
        # Автоматически устанавливаем цену из цветка, если не указана
        if not self.price_at_time and self.flower:
            self.price_at_time = self.flower.price
        super().save(*args, **kwargs)
class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Ожидает обработки'),
        ('confirmed', 'Подтвержден'),
        ('shipped', 'Отправлен'),
        ('delivered', 'Доставлен'),
        ('cancelled', 'Отменен'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    total_price = models.DecimalField(
        'Итоговая сумма', 
        max_digits=10, 
        decimal_places=2, 
        default=0
    )
    status = models.CharField('Статус', max_length=20, choices=STATUS_CHOICES, default='pending')
    address = models.TextField('Адрес доставки')
    phone = models.CharField('Телефон', max_length=20)
    comment = models.TextField('Комментарий к заказу', blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'orders'
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'
        ordering = ['-created_at']
    
    def __str__(self):
        return f'Заказ #{self.id} - {self.user.username}'
    
    def create_from_cart(self):
        """Создает элементы заказа из корзины пользователя"""
        try:
            cart = self.user.cart
            cart_items = cart.cart_items.all()
            
            if not cart_items.exists():
                return False
            
            total = 0
            for cart_item in cart_items:
                OrderItem.objects.create(
                    order=self,
                    flower=cart_item.flower,
                    quantity=cart_item.quantity,
                    price_at_time=cart_item.flower.price
                )
                total += cart_item.get_total_price()
            
            self.total_price = total
            self.save()
            
            # Очищаем корзину после создания заказа
            cart.cart_items.all().delete()
            
            return True
        except Cart.DoesNotExist:
            return False
    
    def update_total_price(self):
        """Обновляет итоговую сумму заказа"""
        total = sum(item.get_total_price() for item in self.order_items.all())
        self.total_price = total
        self.save()
        return total

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    flower = models.ForeignKey(Flower, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField('Количество', default=1)
    price_at_time = models.DecimalField(
        'Цена в момент заказа', 
        max_digits=10, 
        decimal_places=2, 
        default=0
    )
    
    class Meta:
        db_table = 'order_items'
        verbose_name = 'Элемент заказа'
        verbose_name_plural = 'Элементы заказа'
    
    def get_total_price(self):
        if self.price_at_time and self.quantity:
            return self.price_at_time * self.quantity
        return 0
    
    def save(self, *args, **kwargs):
        if not self.price_at_time and self.flower:
            self.price_at_time = self.flower.price
        super().save(*args, **kwargs)
        # Обновляем общую сумму заказа
        if self.order:
            self.order.update_total_price()
    
    def delete(self, *args, **kwargs):
        order = self.order
        super().delete(*args, **kwargs)
        if order:
            order.update_total_price()