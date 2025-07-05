export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  verified: boolean;
  isAdmin?: boolean;
  followers: number;
  following: number;
  joinedDate: Date;
  coverImage?: string;
  country?: string;
  suspended?: boolean;
  suspendedAt?: Date;
  suspendedReason?: string;
  deletedAt?: Date;
}

export interface Tweet {
  id: string;
  content: string;
  author: User;
  createdAt: Date;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  images?: (string | `image:${string}`)[];
  videos?: (string | `video:${string}`)[];
  media?: (string | `image:${string}` | `video:${string}` | { url: string; type: 'image' | 'video' })[];
  isLiked: boolean;
  isRetweeted: boolean;
  isBookmarked: boolean;
  replyTo?: string; // ID of the tweet this is replying to
  hashtags: string[];
  mentions: string[];
  tags?: string[];
  // Pinned tweet fields
  pinnedToProfile?: boolean;
  pinnedToHome?: boolean;
  pinnedAt?: Date;
  // Retweet information
  retweetedBy?: User;
  retweetedAt?: Date;
  isRetweet?: boolean;
  originalTweet?: Tweet;
}

export interface Notification {
  id: string;
  type: 'like' | 'retweet' | 'follow' | 'reply';
  actor: User;
  tweet?: Tweet;
  createdAt: Date;
  read: boolean;
}

export interface Message {
  id: string;
  content: string;
  sender: User;
  recipient: User;
  createdAt: Date;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message;
  unreadCount: number;
}

// Database types
interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  verified: boolean;
  is_admin: boolean;
  followers_count: number;
  following_count: number;
  country: string;
  created_at: string;
  updated_at: string;
}

interface TweetData {
  id: string;
  content: string;
  author_id: string;
  reply_to: string | null;
  image_urls: (string | `image:${string}`)[];
  video_urls?: (string | `video:${string}`)[];
  hashtags: string[];
  mentions: string[];
  tags: string[];
  likes_count: number;
  retweets_count: number;
  replies_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  is_retweet: boolean;
  original_tweet_id: string | null;
}

export interface TweetWithProfile extends TweetData {
  profiles: Profile;
  original_tweet?: TweetWithProfile;
}

interface NotificationData {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: 'like' | 'retweet' | 'follow' | 'reply';
  tweet_id: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationWithProfile extends NotificationData {
  actor_profile: Profile;
  tweet?: TweetWithProfile;
}

// Available tweet categories
export const TWEET_CATEGORIES = [
  'General Discussions',
  'Visas',
  'Hotels',
  'Car Rental',
  'Tourist Schedules',
  'Flights',
  'Restorants and coffees',
  'Images and creators',
  'Real estate'
] as const;

export type TweetCategory = typeof TWEET_CATEGORIES[number];

// Available countries for filtering - Expanded list with bilingual support
export const FILTER_COUNTRIES = [
  { code: 'ALL', name: 'All Countries', nameAr: 'جميع البلدان' },
  { code: 'AD', name: 'Andorra', nameAr: 'أندورا' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة' },
  { code: 'AF', name: 'Afghanistan', nameAr: 'أفغانستان' },
  { code: 'AG', name: 'Antigua and Barbuda', nameAr: 'أنتيغوا وبربودا' },
  { code: 'AI', name: 'Anguilla', nameAr: 'أنغيلا' },
  { code: 'AL', name: 'Albania', nameAr: 'ألبانيا' },
  { code: 'AM', name: 'Armenia', nameAr: 'أرمينيا' },
  { code: 'AO', name: 'Angola', nameAr: 'أنغولا' },
  { code: 'AQ', name: 'Antarctica', nameAr: 'القارة القطبية الجنوبية' },
  { code: 'AR', name: 'Argentina', nameAr: 'الأرجنتين' },
  { code: 'AS', name: 'American Samoa', nameAr: 'ساموا الأمريكية' },
  { code: 'AT', name: 'Austria', nameAr: 'النمسا' },
  { code: 'AU', name: 'Australia', nameAr: 'أستراليا' },
  { code: 'AW', name: 'Aruba', nameAr: 'أروبا' },
  { code: 'AX', name: 'Åland Islands', nameAr: 'جزر آلاند' },
  { code: 'AZ', name: 'Azerbaijan', nameAr: 'أذربيجان' },
  { code: 'BA', name: 'Bosnia and Herzegovina', nameAr: 'البوسنة والهرسك' },
  { code: 'BB', name: 'Barbados', nameAr: 'بربادوس' },
  { code: 'BD', name: 'Bangladesh', nameAr: 'بنغلاديش' },
  { code: 'BE', name: 'Belgium', nameAr: 'بلجيكا' },
  { code: 'BF', name: 'Burkina Faso', nameAr: 'بوركينا فاسو' },
  { code: 'BG', name: 'Bulgaria', nameAr: 'بلغاريا' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين' },
  { code: 'BI', name: 'Burundi', nameAr: 'بوروندي' },
  { code: 'BJ', name: 'Benin', nameAr: 'بنين' },
  { code: 'BL', name: 'Saint Barthélemy', nameAr: 'سان بارتيليمي' },
  { code: 'BM', name: 'Bermuda', nameAr: 'برمودا' },
  { code: 'BN', name: 'Brunei', nameAr: 'بروناي' },
  { code: 'BO', name: 'Bolivia', nameAr: 'بوليفيا' },
  { code: 'BQ', name: 'Caribbean Netherlands', nameAr: 'هولندا الكاريبية' },
  { code: 'BR', name: 'Brazil', nameAr: 'البرازيل' },
  { code: 'BS', name: 'Bahamas', nameAr: 'جزر البهاما' },
  { code: 'BT', name: 'Bhutan', nameAr: 'بوتان' },
  { code: 'BV', name: 'Bouvet Island', nameAr: 'جزيرة بوفيت' },
  { code: 'BW', name: 'Botswana', nameAr: 'بوتسوانا' },
  { code: 'BY', name: 'Belarus', nameAr: 'بيلاروسيا' },
  { code: 'BZ', name: 'Belize', nameAr: 'بليز' },
  { code: 'CA', name: 'Canada', nameAr: 'كندا' },
  { code: 'CC', name: 'Cocos Islands', nameAr: 'جزر كوكوس' },
  { code: 'CD', name: 'Democratic Republic of the Congo', nameAr: 'جمهورية الكونغو الديمقراطية' },
  { code: 'CF', name: 'Central African Republic', nameAr: 'جمهورية إفريقيا الوسطى' },
  { code: 'CG', name: 'Republic of the Congo', nameAr: 'جمهورية الكونغو' },
  { code: 'CH', name: 'Switzerland', nameAr: 'سويسرا' },
  { code: 'CI', name: 'Côte d\'Ivoire', nameAr: 'ساحل العاج' },
  { code: 'CK', name: 'Cook Islands', nameAr: 'جزر كوك' },
  { code: 'CL', name: 'Chile', nameAr: 'تشيلي' },
  { code: 'CM', name: 'Cameroon', nameAr: 'الكاميرون' },
  { code: 'CN', name: 'China', nameAr: 'الصين' },
  { code: 'CO', name: 'Colombia', nameAr: 'كولومبيا' },
  { code: 'CR', name: 'Costa Rica', nameAr: 'كوستاريكا' },
  { code: 'CU', name: 'Cuba', nameAr: 'كوبا' },
  { code: 'CV', name: 'Cape Verde', nameAr: 'الرأس الأخضر' },
  { code: 'CW', name: 'Curaçao', nameAr: 'كوراساو' },
  { code: 'CX', name: 'Christmas Island', nameAr: 'جزيرة الكريسماس' },
  { code: 'CY', name: 'Cyprus', nameAr: 'قبرص' },
  { code: 'CZ', name: 'Czech Republic', nameAr: 'جمهورية التشيك' },
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا' },
  { code: 'DJ', name: 'Djibouti', nameAr: 'جيبوتي' },
  { code: 'DK', name: 'Denmark', nameAr: 'الدنمارك' },
  { code: 'DM', name: 'Dominica', nameAr: 'دومينيكا' },
  { code: 'DO', name: 'Dominican Republic', nameAr: 'جمهورية الدومينيكان' },
  { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر' },
  { code: 'EC', name: 'Ecuador', nameAr: 'الإكوادور' },
  { code: 'EE', name: 'Estonia', nameAr: 'إستونيا' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر' },
  { code: 'EH', name: 'Western Sahara', nameAr: 'الصحراء الغربية' },
  { code: 'ER', name: 'Eritrea', nameAr: 'إريتريا' },
  { code: 'ES', name: 'Spain', nameAr: 'إسبانيا' },
  { code: 'ET', name: 'Ethiopia', nameAr: 'إثيوبيا' },
  { code: 'FI', name: 'Finland', nameAr: 'فنلندا' },
  { code: 'FJ', name: 'Fiji', nameAr: 'فيجي' },
  { code: 'FK', name: 'Falkland Islands', nameAr: 'جزر فوكلاند' },
  { code: 'FM', name: 'Micronesia', nameAr: 'ميكرونيزيا' },
  { code: 'FO', name: 'Faroe Islands', nameAr: 'جزر فارو' },
  { code: 'FR', name: 'France', nameAr: 'فرنسا' },
  { code: 'GA', name: 'Gabon', nameAr: 'الغابون' },
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة' },
  { code: 'GD', name: 'Grenada', nameAr: 'غرينادا' },
  { code: 'GE', name: 'Georgia', nameAr: 'جورجيا' },
  { code: 'GF', name: 'French Guiana', nameAr: 'غيانا الفرنسية' },
  { code: 'GG', name: 'Guernsey', nameAr: 'غيرنزي' },
  { code: 'GH', name: 'Ghana', nameAr: 'غانا' },
  { code: 'GI', name: 'Gibraltar', nameAr: 'جبل طارق' },
  { code: 'GL', name: 'Greenland', nameAr: 'غرينلاند' },
  { code: 'GM', name: 'Gambia', nameAr: 'غامبيا' },
  { code: 'GN', name: 'Guinea', nameAr: 'غينيا' },
  { code: 'GP', name: 'Guadeloupe', nameAr: 'غوادلوب' },
  { code: 'GQ', name: 'Equatorial Guinea', nameAr: 'غينيا الاستوائية' },
  { code: 'GR', name: 'Greece', nameAr: 'اليونان' },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands', nameAr: 'جورجيا الجنوبية وجزر ساندويتش الجنوبية' },
  { code: 'GT', name: 'Guatemala', nameAr: 'غواتيمالا' },
  { code: 'GU', name: 'Guam', nameAr: 'غوام' },
  { code: 'GW', name: 'Guinea-Bissau', nameAr: 'غينيا بيساو' },
  { code: 'GY', name: 'Guyana', nameAr: 'غيانا' },
  { code: 'HK', name: 'Hong Kong', nameAr: 'هونغ كونغ' },
  { code: 'HM', name: 'Heard Island and McDonald Islands', nameAr: 'جزيرة هيرد وجزر ماكدونالد' },
  { code: 'HN', name: 'Honduras', nameAr: 'هندوراس' },
  { code: 'HR', name: 'Croatia', nameAr: 'كرواتيا' },
  { code: 'HT', name: 'Haiti', nameAr: 'هايتي' },
  { code: 'HU', name: 'Hungary', nameAr: 'المجر' },
  { code: 'ID', name: 'Indonesia', nameAr: 'إندونيسيا' },
  { code: 'IE', name: 'Ireland', nameAr: 'أيرلندا' },
  { code: 'IL', name: 'Israel', nameAr: 'إسرائيل' },
  { code: 'IM', name: 'Isle of Man', nameAr: 'جزيرة مان' },
  { code: 'IN', name: 'India', nameAr: 'الهند' },
  { code: 'IO', name: 'British Indian Ocean Territory', nameAr: 'إقليم المحيط الهندي البريطاني' },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق' },
  { code: 'IR', name: 'Iran', nameAr: 'إيران' },
  { code: 'IS', name: 'Iceland', nameAr: 'آيسلندا' },
  { code: 'IT', name: 'Italy', nameAr: 'إيطاليا' },
  { code: 'JE', name: 'Jersey', nameAr: 'جيرسي' },
  { code: 'JM', name: 'Jamaica', nameAr: 'جامايكا' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن' },
  { code: 'JP', name: 'Japan', nameAr: 'اليابان' },
  { code: 'KE', name: 'Kenya', nameAr: 'كينيا' },
  { code: 'KG', name: 'Kyrgyzstan', nameAr: 'قرغيزستان' },
  { code: 'KH', name: 'Cambodia', nameAr: 'كمبوديا' },
  { code: 'KI', name: 'Kiribati', nameAr: 'كيريباتي' },
  { code: 'KM', name: 'Comoros', nameAr: 'جزر القمر' },
  { code: 'KN', name: 'Saint Kitts and Nevis', nameAr: 'سانت كيتس ونيفيس' },
  { code: 'KP', name: 'North Korea', nameAr: 'كوريا الشمالية' },
  { code: 'KR', name: 'South Korea', nameAr: 'كوريا الجنوبية' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت' },
  { code: 'KY', name: 'Cayman Islands', nameAr: 'جزر كايمان' },
  { code: 'KZ', name: 'Kazakhstan', nameAr: 'كازاخستان' },
  { code: 'LA', name: 'Laos', nameAr: 'لاوس' },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان' },
  { code: 'LC', name: 'Saint Lucia', nameAr: 'سانت لوسيا' },
  { code: 'LI', name: 'Liechtenstein', nameAr: 'ليختنشتاين' },
  { code: 'LK', name: 'Sri Lanka', nameAr: 'سريلانكا' },
  { code: 'LR', name: 'Liberia', nameAr: 'ليبيريا' },
  { code: 'LS', name: 'Lesotho', nameAr: 'ليسوتو' },
  { code: 'LT', name: 'Lithuania', nameAr: 'ليتوانيا' },
  { code: 'LU', name: 'Luxembourg', nameAr: 'لوكسمبورغ' },
  { code: 'LV', name: 'Latvia', nameAr: 'لاتفيا' },
  { code: 'LY', name: 'Libya', nameAr: 'ليبيا' },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب' },
  { code: 'MC', name: 'Monaco', nameAr: 'موناكو' },
  { code: 'MD', name: 'Moldova', nameAr: 'مولدوفا' },
  { code: 'ME', name: 'Montenegro', nameAr: 'الجبل الأسود' },
  { code: 'MF', name: 'Saint Martin', nameAr: 'سان مارتن' },
  { code: 'MG', name: 'Madagascar', nameAr: 'مدغشقر' },
  { code: 'MH', name: 'Marshall Islands', nameAr: 'جزر مارشال' },
  { code: 'MK', name: 'North Macedonia', nameAr: 'مقدونيا الشمالية' },
  { code: 'ML', name: 'Mali', nameAr: 'مالي' },
  { code: 'MM', name: 'Myanmar', nameAr: 'ميانمار' },
  { code: 'MN', name: 'Mongolia', nameAr: 'منغوليا' },
  { code: 'MO', name: 'Macao', nameAr: 'ماكاو' },
  { code: 'MP', name: 'Northern Mariana Islands', nameAr: 'جزر ماريانا الشمالية' },
  { code: 'MQ', name: 'Martinique', nameAr: 'مارتينيك' },
  { code: 'MR', name: 'Mauritania', nameAr: 'موريتانيا' },
  { code: 'MS', name: 'Montserrat', nameAr: 'مونتسرات' },
  { code: 'MT', name: 'Malta', nameAr: 'مالطا' },
  { code: 'MU', name: 'Mauritius', nameAr: 'موريشيوس' },
  { code: 'MV', name: 'Maldives', nameAr: 'المالديف' },
  { code: 'MW', name: 'Malawi', nameAr: 'ملاوي' },
  { code: 'MX', name: 'Mexico', nameAr: 'المكسيك' },
  { code: 'MY', name: 'Malaysia', nameAr: 'ماليزيا' },
  { code: 'MZ', name: 'Mozambique', nameAr: 'موزمبيق' },
  { code: 'NA', name: 'Namibia', nameAr: 'ناميبيا' },
  { code: 'NC', name: 'New Caledonia', nameAr: 'كاليدونيا الجديدة' },
  { code: 'NE', name: 'Niger', nameAr: 'النيجر' },
  { code: 'NF', name: 'Norfolk Island', nameAr: 'جزيرة نورفولك' },
  { code: 'NG', name: 'Nigeria', nameAr: 'نيجيريا' },
  { code: 'NI', name: 'Nicaragua', nameAr: 'نيكاراغوا' },
  { code: 'NL', name: 'Netherlands', nameAr: 'هولندا' },
  { code: 'NO', name: 'Norway', nameAr: 'النرويج' },
  { code: 'NP', name: 'Nepal', nameAr: 'نيبال' },
  { code: 'NR', name: 'Nauru', nameAr: 'ناورو' },
  { code: 'NU', name: 'Niue', nameAr: 'نيوي' },
  { code: 'NZ', name: 'New Zealand', nameAr: 'نيوزيلندا' },
  { code: 'OM', name: 'Oman', nameAr: 'عُمان' },
  { code: 'PA', name: 'Panama', nameAr: 'بناما' },
  { code: 'PE', name: 'Peru', nameAr: 'بيرو' },
  { code: 'PF', name: 'French Polynesia', nameAr: 'بولينزيا الفرنسية' },
  { code: 'PG', name: 'Papua New Guinea', nameAr: 'بابوا غينيا الجديدة' },
  { code: 'PH', name: 'Philippines', nameAr: 'الفلبين' },
  { code: 'PK', name: 'Pakistan', nameAr: 'باكستان' },
  { code: 'PL', name: 'Poland', nameAr: 'بولندا' },
  { code: 'PM', name: 'Saint Pierre and Miquelon', nameAr: 'سان بيير وميكلون' },
  { code: 'PN', name: 'Pitcairn', nameAr: 'بيتكيرن' },
  { code: 'PR', name: 'Puerto Rico', nameAr: 'بورتوريكو' },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين' },
  { code: 'PT', name: 'Portugal', nameAr: 'البرتغال' },
  { code: 'PW', name: 'Palau', nameAr: 'بالاو' },
  { code: 'PY', name: 'Paraguay', nameAr: 'باراغواي' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر' },
  { code: 'RE', name: 'Réunion', nameAr: 'ريونيون' },
  { code: 'RO', name: 'Romania', nameAr: 'رومانيا' },
  { code: 'RS', name: 'Serbia', nameAr: 'صربيا' },
  { code: 'RU', name: 'Russia', nameAr: 'روسيا' },
  { code: 'RW', name: 'Rwanda', nameAr: 'رواندا' },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية' },
  { code: 'SB', name: 'Solomon Islands', nameAr: 'جزر سليمان' },
  { code: 'SC', name: 'Seychelles', nameAr: 'سيشل' },
  { code: 'SD', name: 'Sudan', nameAr: 'السودان' },
  { code: 'SE', name: 'Sweden', nameAr: 'السويد' },
  { code: 'SG', name: 'Singapore', nameAr: 'سنغافورة' },
  { code: 'SH', name: 'Saint Helena', nameAr: 'سانت هيلينا' },
  { code: 'SI', name: 'Slovenia', nameAr: 'سلوفينيا' },
  { code: 'SJ', name: 'Svalbard and Jan Mayen', nameAr: 'سفالبارد وجان ماين' },
  { code: 'SK', name: 'Slovakia', nameAr: 'سلوفاكيا' },
  { code: 'SL', name: 'Sierra Leone', nameAr: 'سيراليون' },
  { code: 'SM', name: 'San Marino', nameAr: 'سان مارينو' },
  { code: 'SN', name: 'Senegal', nameAr: 'السنغال' },
  { code: 'SO', name: 'Somalia', nameAr: 'الصومال' },
  { code: 'SR', name: 'Suriname', nameAr: 'سورينام' },
  { code: 'SS', name: 'South Sudan', nameAr: 'جنوب السودان' },
  { code: 'ST', name: 'São Tomé and Príncipe', nameAr: 'ساو تومي وبرينسيبي' },
  { code: 'SV', name: 'El Salvador', nameAr: 'السلفادور' },
  { code: 'SX', name: 'Sint Maarten', nameAr: 'سينت مارتن' },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا' },
  { code: 'SZ', name: 'Eswatini', nameAr: 'إسواتيني' },
  { code: 'TC', name: 'Turks and Caicos Islands', nameAr: 'جزر تركس وكايكوس' },
  { code: 'TD', name: 'Chad', nameAr: 'تشاد' },
  { code: 'TF', name: 'French Southern Territories', nameAr: 'الأقاليم الجنوبية الفرنسية' },
  { code: 'TG', name: 'Togo', nameAr: 'توغو' },
  { code: 'TH', name: 'Thailand', nameAr: 'تايلاند' },
  { code: 'TJ', name: 'Tajikistan', nameAr: 'طاجيكستان' },
  { code: 'TK', name: 'Tokelau', nameAr: 'توكيلاو' },
  { code: 'TL', name: 'Timor-Leste', nameAr: 'تيمور الشرقية' },
  { code: 'TM', name: 'Turkmenistan', nameAr: 'تركمانستان' },
  { code: 'TN', name: 'Tunisia', nameAr: 'تونس' },
  { code: 'TO', name: 'Tonga', nameAr: 'تونغا' },
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا' },
  { code: 'TT', name: 'Trinidad and Tobago', nameAr: 'ترينيداد وتوباغو' },
  { code: 'TV', name: 'Tuvalu', nameAr: 'توفالو' },
  { code: 'TW', name: 'Taiwan', nameAr: 'تايوان' },
  { code: 'TZ', name: 'Tanzania', nameAr: 'تنزانيا' },
  { code: 'UA', name: 'Ukraine', nameAr: 'أوكرانيا' },
  { code: 'UG', name: 'Uganda', nameAr: 'أوغندا' },
  { code: 'UM', name: 'United States Minor Outlying Islands', nameAr: 'جزر الولايات المتحدة البعيدة الصغيرة' },
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة' },
  { code: 'UY', name: 'Uruguay', nameAr: 'أوروغواي' },
  { code: 'UZ', name: 'Uzbekistan', nameAr: 'أوزبكستان' },
  { code: 'VA', name: 'Vatican City', nameAr: 'مدينة الفاتيكان' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', nameAr: 'سانت فنسنت والغرينادين' },
  { code: 'VE', name: 'Venezuela', nameAr: 'فنزويلا' },
  { code: 'VG', name: 'British Virgin Islands', nameAr: 'جزر العذراء البريطانية' },
  { code: 'VI', name: 'U.S. Virgin Islands', nameAr: 'جزر العذراء الأمريكية' },
  { code: 'VN', name: 'Vietnam', nameAr: 'فيتنام' },
  { code: 'VU', name: 'Vanuatu', nameAr: 'فانواتو' },
  { code: 'WF', name: 'Wallis and Futuna', nameAr: 'واليس وفوتونا' },
  { code: 'WS', name: 'Samoa', nameAr: 'ساموا' },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن' },
  { code: 'YT', name: 'Mayotte', nameAr: 'مايوت' },
  { code: 'ZA', name: 'South Africa', nameAr: 'جنوب أفريقيا' },
  { code: 'ZM', name: 'Zambia', nameAr: 'زامبيا' },
  { code: 'ZW', name: 'Zimbabwe', nameAr: 'زيمبابوي' }
];

export type FilterCountry = typeof FILTER_COUNTRIES[number];

// Helper function to get localized country name
export const getLocalizedCountryName = (country: FilterCountry, language: 'en' | 'ar'): string => {
  if (language === 'ar' && 'nameAr' in country) {
    return country.nameAr;
  }
  return country.name;
};

// Legacy type for backward compatibility
type TweetTag = TweetCategory;
const TWEET_TAGS = TWEET_CATEGORIES;