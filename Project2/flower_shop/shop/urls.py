from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'flowers', views.FlowerViewSet)
router.register(r'cart', views.CartViewSet, basename='cart')
router.register(r'favorites', views.FavoriteViewSet, basename='favorite')
router.register(r'orders', views.OrderViewSet, basename='order')

urlpatterns = [
    path('api/', include(router.urls)),
]