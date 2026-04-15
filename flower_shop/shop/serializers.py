from rest_framework import serializers
from .models import User, Flower, Cart, CartItem, Favorite, Order, OrderItem


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'address', 'avatar', 'created_at']
        read_only_fields = ['id', 'created_at']


class FlowerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flower
        fields = '__all__'


class CartItemSerializer(serializers.ModelSerializer):
    flower_name = serializers.CharField(source='flower.name', read_only=True)
    flower_price = serializers.DecimalField(source='flower.price', read_only=True, max_digits=10, decimal_places=2)
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = CartItem
        fields = ['id', 'flower', 'flower_name', 'quantity', 'flower_price', 'total_price']
    
    def get_total_price(self, obj):
        return obj.get_total_price()


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(source='cart_items', many=True, read_only=True)
    total_price = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()
    
    class Meta:
        model = Cart
        fields = ['id', 'user', 'items', 'total_price', 'total_items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_total_price(self, obj):
        return obj.get_total_price()
    
    def get_total_items(self, obj):
        return obj.get_total_items()


class FavoriteSerializer(serializers.ModelSerializer):
    flower_details = FlowerSerializer(source='flower', read_only=True)
    
    class Meta:
        model = Favorite
        fields = ['id', 'user', 'flower', 'flower_details', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'flower', 'quantity', 'price_at_time', 'get_total_price']


class OrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True, read_only=True)
    user_info = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'user', 'user_info', 'total_price', 'status', 'address', 'phone', 'comment', 'order_items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']