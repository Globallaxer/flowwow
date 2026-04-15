from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.middleware.csrf import get_token
import jwt
import datetime
from .models import User, Flower, Cart, CartItem, Favorite, Order, OrderItem
from .serializers import (
    UserSerializer, FlowerSerializer, CartSerializer, 
    CartItemSerializer, FavoriteSerializer, OrderSerializer
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'], url_path='csrf')
    def get_csrf_token(self, request):
        token = get_token(request)
        return Response({'csrfToken': token})
    
    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'Заполните все поля'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Пользователь с таким именем уже существует'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.create_user(username=username, password=password)
            Cart.objects.get_or_create(user=user)
            token = self._generate_token(user)
            
            return Response({
                'user_id': user.id,
                'username': user.username,
                'avatar': str(user.avatar) if user.avatar else None,
                'token': token
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='login')
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'Заполните все поля'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = authenticate(username=username, password=password)
        
        if user:
            token = self._generate_token(user)
            return Response({
                'user_id': user.id,
                'username': user.username,
                'avatar': str(user.avatar) if user.avatar else None,
                'token': token
            })
        else:
            return Response({'error': 'Неверный логин или пароль'}, status=status.HTTP_401_UNAUTHORIZED)
    
    def _generate_token(self, user):
        payload = {
            'userId': user.id,
            'username': user.username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }
        token = jwt.encode(payload, 'your-secret-key', algorithm='HS256')
        return token
    
    @action(detail=True, methods=['post'], url_path='change-password')
    def change_password(self, request, pk=None):
        user = self.get_object()
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not user.check_password(current_password):
            return Response({'error': 'Текущий пароль неверный'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Пароль успешно изменен'})
    
    @action(detail=True, methods=['post'], url_path='upload-avatar')
    def upload_avatar(self, request, pk=None):
        user = self.get_object()
        if 'avatar' in request.FILES:
            user.avatar = request.FILES['avatar']
            user.save()
            return Response({'avatar': str(user.avatar)})
        return Response({'error': 'Файл не загружен'}, status=status.HTTP_400_BAD_REQUEST)


class FlowerViewSet(viewsets.ModelViewSet):
    queryset = Flower.objects.all()
    serializer_class = FlowerSerializer
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        category = request.query_params.get('category', None)
        if category and category != 'all':
            flowers = self.queryset.filter(category=category)
        else:
            flowers = self.queryset
        serializer = self.get_serializer(flowers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        flowers = self.queryset.filter(is_popular=True)[:6]
        serializer = self.get_serializer(flowers, many=True)
        return Response(serializer.data)


class CartViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='my-cart')
    def my_cart(self, request):
        """Получение корзины текущего пользователя"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        
        items = []
        for cart_item in cart.cart_items.all():
            items.append({
                'id': cart_item.flower.id,
                'name': cart_item.flower.name,
                'price': float(cart_item.flower.price),
                'quantity': cart_item.quantity,
                'image': cart_item.flower.image.url if cart_item.flower.image else None,
                'total': float(cart_item.get_total_price())
            })
        
        return Response({
            'cart': items,
            'items': items,
            'total_items': cart.get_total_items(),
            'total_price': float(cart.get_total_price())
        })
    
    @action(detail=False, methods=['get'], url_path='')
    def get_cart(self, request):
        """Альтернативный метод получения корзины"""
        return self.my_cart(request)
    
    @action(detail=False, methods=['post'], url_path='add')
    def add_item(self, request):
        product_id = request.data.get('productId') or request.data.get('product_id')
        quantity = request.data.get('quantity', 1)
        
        if not product_id:
            return Response({'error': 'Не указан ID товара'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            flower = get_object_or_404(Flower, id=product_id)
            cart, _ = Cart.objects.get_or_create(user=request.user)
            
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                flower=flower,
                defaults={'quantity': quantity}
            )
            
            if not created:
                cart_item.quantity += quantity
                cart_item.save()
            
            return Response({
                'success': True,
                'message': 'Товар добавлен в корзину',
                'cart_item_id': cart_item.id,
                'quantity': cart_item.quantity
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='update')
    def update_item(self, request):
        product_id = request.data.get('productId') or request.data.get('product_id')
        quantity = request.data.get('quantity', 1)
        
        cart = get_object_or_404(Cart, user=request.user)
        cart_item = get_object_or_404(CartItem, cart=cart, flower_id=product_id)
        
        if quantity <= 0:
            cart_item.delete()
        else:
            cart_item.quantity = quantity
            cart_item.save()
        
        return Response({'success': True, 'message': 'Корзина обновлена'})
    
    @action(detail=False, methods=['post'], url_path='remove')
    def remove_item(self, request):
        product_id = request.data.get('productId') or request.data.get('product_id')
        
        cart = get_object_or_404(Cart, user=request.user)
        CartItem.objects.filter(cart=cart, flower_id=product_id).delete()
        
        return Response({'success': True, 'message': 'Товар удален из корзины'})


class FavoriteViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='my-favorites')
    def my_favorites(self, request):
        favorites = Favorite.objects.filter(user=request.user)
        favorite_ids = [fav.flower_id for fav in favorites]
        return Response({'favorites': favorite_ids})
    
    @action(detail=False, methods=['get'], url_path='')
    def get_favorites(self, request):
        return self.my_favorites(request)
    
    @action(detail=False, methods=['post'], url_path='add')
    def add_favorite(self, request):
        product_id = request.data.get('productId') or request.data.get('product_id')
        
        if not product_id:
            return Response({'error': 'Не указан ID товара'}, status=status.HTTP_400_BAD_REQUEST)
        
        flower = get_object_or_404(Flower, id=product_id)
        
        favorite, created = Favorite.objects.get_or_create(
            user=request.user,
            flower=flower
        )
        
        if created:
            return Response({'success': True, 'message': 'Добавлено в избранное', 'added': True}, status=status.HTTP_201_CREATED)
        return Response({'success': True, 'message': 'Уже в избранном', 'added': False}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='remove')
    def remove_favorite(self, request):
        product_id = request.data.get('productId') or request.data.get('product_id')
        
        if not product_id:
            return Response({'error': 'Не указан ID товара'}, status=status.HTTP_400_BAD_REQUEST)
        
        Favorite.objects.filter(user=request.user, flower_id=product_id).delete()
        
        return Response({'success': True, 'message': 'Удалено из избранного', 'removed': True})


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('order_items__flower')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'orders': serializer.data,
            'results': serializer.data
        })
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)