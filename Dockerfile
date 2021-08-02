FROM debian:buster-slim
MAINTAINER Daniel Sobe <daniel.sobe@sorben.com>

# docker build -t web_demo_spoznawanje .
# docker build -t web_demo_spoznawanje . --no-cache

RUN apt update

###################################
# Setup locale
###################################

RUN apt-get install -y locales

RUN sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    locale-gen

ENV LC_ALL en_US.UTF-8 
ENV LANG en_US.UTF-8  
ENV LANGUAGE en_US:en     

###################################
# Web server
###################################

RUN apt install -y apache2 php

RUN a2enmod ssl

RUN a2ensite default-ssl

RUN apt install -y ffmpeg

###################################
# Recognition software
###################################

RUN apt install -y g++ make git

RUN git clone https://github.com/ZalozbaDev/dLabPro.git dLabPro

RUN cd dLabPro && git checkout mudralampa_x86

RUN apt install -y libreadline-dev portaudio19-dev

RUN cd dLabPro && make -C programs/recognizer RELEASE

RUN mkdir -p /var/www/html/smartlamp && cp dLabPro/bin.release/recognizer /var/www/html/smartlamp

RUN git clone https://github.com/ZalozbaDev/db-hsb-asr.git db-hsb-asr

RUN cd db-hsb-asr && git checkout develop && cp config/*.object config/*.gmm config/*.cfg ../var/www/html/smartlamp

COPY smartlamp/recognizer.sh /var/www/html/smartlamp

###################################
# Pages
###################################

RUN apt install -y curl

COPY www /var/www/html/mudralampa

RUN curl https://code.jquery.com/jquery-3.5.1.min.js > /var/www/html/mudralampa/js/jquery-3.5.1.min.js

RUN curl https://code.jquery.com/color/jquery.color-2.1.2.min.js > /var/www/html/mudralampa/js/jquery.color-2.1.2.min.js

RUN git clone https://github.com/blueimp/JavaScript-MD5
RUN cp JavaScript-MD5/js/md5.min.js /var/www/html/mudralampa/js/
RUN rm -rf JavaScript-MD5

RUN mkdir /var/www/html/audio

RUN sed -i "s/DocumentRoot.*html/DocumentRoot\ \/var\/www\/html\/mudralampa\//" /etc/apache2/sites-available/000-default.conf 

RUN sed -i "s/DocumentRoot.*html/DocumentRoot\ \/var\/www\/html\/mudralampa\//" /etc/apache2/sites-available/default-ssl.conf

RUN chown -R www-data:www-data /var/www/html/

###################################
# Container config
###################################

# nice to have
RUN apt install -y nano

# remove stuff only required for building container
RUN apt remove -y --purge g++ make git curl

RUN apt autoremove -y --purge

RUN apt-get clean

# expose both but only HTTPS will actually be functional
EXPOSE 80 443

CMD apachectl -D FOREGROUND
