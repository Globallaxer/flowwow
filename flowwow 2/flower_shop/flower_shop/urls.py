from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('shop.urls')),
    
    # Страницы фронтенда
    path('', TemplateView.as_view(template_name='index.html'), name='index'),
    path('catalog.html', TemplateView.as_view(template_name='catalog.html'), name='catalog'),
    path('about.html', TemplateView.as_view(template_name='about.html'), name='about'),
    path('profile.html', TemplateView.as_view(template_name='profile.html'), name='profile'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)