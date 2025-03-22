server {
        listen 80;
        listen [::]:80;
        server_name admin.rbxchance.com;
        root /apps/rbxchance-admin/build;

	# auth_basic "Closed Beta!";
	# auth_basic_user_file /apps/beta-pw-2/.htpasswd;

        location / {
                try_files $uri /index.html;
        }
}
