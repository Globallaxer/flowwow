from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from .models import User, Flower, Cart, CartItem, Favorite, Order, OrderItem
from .serializers import (
    UserSerializer, FlowerSerializer, CartSerializer, 
    CartItemSerializer, FavoriteSerializer, OrderSerializer
)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

class FlowerViewSet(viewsets.ModelViewSet):
    queryset = Flower.objects.all()
    serializer_class = FlowerSerializer
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        category = request.query_params.get('category')
        if category:
            flowers = self.queryset.filter(category=category)
            serializer = self.get_serializer(flowers, many=True)
            return Response(serializer.data)
        return Response({'error': 'Category parameter required'}, status=400)
    
    @action(detail=False, methods=['get'])
    def top_rated(self, request):
        flowers = self.queryset.order_by('-rating')[:10]
        serializer = self.get_serializer(flowers, many=True)
        return Response(serializer.data)

class CartViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CartSerializer
    
    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_cart(self, request):
        cart, created = Cart.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def add_item(self, request):
        flower_id = request.data.get('flower_id')
        quantity = request.data.get('quantity', 1)
        
        flower = get_object_or_404(Flower, id=flower_id)
        cart, created = Cart.objects.get_or_create(user=request.user)
        
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, 
            flower=flower,
            defaults={'quantity': quantity}
        )
        
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        
        serializer = CartItemSerializer(cart_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def update_item(self, request):
        flower_id = request.data.get('flower_id')
        quantity = request.data.get('quantity')
        
        cart = get_object_or_404(Cart, user=request.user)
        cart_item = get_object_or_404(CartItem, cart=cart, flower_id=flower_id)
        
        if quantity <= 0:
            cart_item.delete()
        else:
            cart_item.quantity = quantity
            cart_item.save()
        
        return Response({'status': 'updated'})
    
    @action(detail=False, methods=['delete'])
    def clear(self, request):
        cart = get_object_or_404(Cart, user=request.user)
        cart.cart_items.all().delete()
        return Response({'status': 'cleared'})

class FavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def add_favorite(self, request):
        flower_id = request.data.get('flower_id')
        flower = get_object_or_404(Flower, id=flower_id)
        
        favorite, created = Favorite.objects.get_or_create(
            user=request.user,
            flower=flower
        )
        
        if created:
            return Response({'status': 'added'}, status=status.HTTP_201_CREATED)
        return Response({'status': 'already exists'})
    
    @action(detail=False, methods=['delete'])
    def remove_favorite(self, request):
        flower_id = request.data.get('flower_id')
        Favorite.objects.filter(user=request.user, flower_id=flower_id).delete()
        return Response({'status': 'removed'})

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)
    
    def create(self, request):
        cart = get_object_or_404(Cart, user=request.user)
        cart_items = cart.cart_items.all()
        
        if not cart_items.exists():
            return Response({'error': 'Cart is empty'}, status=400)
        
        total_price = cart.get_total_price()
        
        order = Order.objects.create(
            user=request.user,
            total_price=total_price,
            address=request.data.get('address'),
            phone=request.data.get('phone'),
            comment=request.data.get('comment', '')
        )
        
        for item in cart_items:
            OrderItem.objects.create(
                order=order,
                flower=item.flower,
                quantity=item.quantity,
                price_at_time=item.flower.price
            )
        
        cart_items.delete()
        
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)